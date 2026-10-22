"use client";

import type { OwnerVehicle, VehicleStatus } from "@car-rental/contracts";
import { Car, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { vehicleTitle } from "@/domains/vehicles/format";
import { errorMessage } from "@/shared/api/api-error";
import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DataTable } from "@/shared/components/ui/data-table";
import { EmptyState, ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { Pagination } from "@/shared/components/ui/pagination";
import { useToast } from "@/shared/components/ui/toast";
import { formatPrice } from "@/shared/lib/utils";
import { useOwnerVehicles, useSetVehicleStatus } from "../hooks";

const PAGE_SIZE = 10;
const statusBadge: Record<VehicleStatus, { label: string; variant: BadgeProps["variant"] }> = {
  ACTIVE: { label: "Listed", variant: "success" },
  DRAFT: { label: "Draft", variant: "soft" },
  INACTIVE: { label: "Unlisted", variant: "neutral" },
  ARCHIVED: { label: "Archived", variant: "danger" },
};

/** "My listing" (41) adapted for a rental fleet. */
export function FleetView() {
  const [page, setPage] = useState(1);
  const vehicles = useOwnerVehicles({ page, pageSize: PAGE_SIZE });
  const setStatus = useSetVehicleStatus();
  const toast = useToast();
  const [archiving, setArchiving] = useState<OwnerVehicle | null>(null);

  async function changeStatus(vehicle: OwnerVehicle, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      await setStatus.mutateAsync({ id: vehicle.id, status, version: vehicle.version });
      toast.success(status === "ACTIVE" ? "Vehicle listed" : status === "INACTIVE" ? "Vehicle unlisted" : "Vehicle archived");
    } catch (error) {
      toast.error("Couldn't update the vehicle", errorMessage(error));
    }
  }

  if (vehicles.isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (vehicles.isError) return <ErrorState action={<Button onClick={() => vehicles.refetch()}>Try again</Button>} />;
  if (vehicles.data.total === 0) {
    return (
      <EmptyState
        icon={<Car />}
        title="List your first car"
        description="Add a vehicle, publish it, and renters can start booking."
        action={
          <Button asChild>
            <Link href="/dashboard/fleet/new">Add a vehicle</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <p className="text-sm">
        <span className="font-semibold text-primary">{vehicles.data.total}</span> vehicles
      </p>
      <DataTable
        caption="Your vehicles"
        rows={vehicles.data.items}
        rowKey={(v) => v.id}
        columns={[
          {
            header: "Listing",
            cell: (v) => (
              <div className="flex items-center gap-4">
                <VehicleImage src={v.imageUrl} alt="" ratio="thumb" className="w-28 shrink-0 rounded-lg" sizes="112px" />
                <div>
                  <p className="font-heading font-medium text-heading">{vehicleTitle(v)}</p>
                  <p className="text-xs">{v.city}</p>
                  <p className="font-heading font-medium text-primary">{formatPrice(v.dailyRateCents, v.currency)} / day</p>
                </div>
              </div>
            ),
          },
          { header: "Status", cell: (v) => <Badge variant={statusBadge[v.status].variant}>{statusBadge[v.status].label}</Badge> },
          { header: "Updated", cell: (v) => <span className="text-sm text-heading">{new Date(v.updatedAt).toLocaleDateString()}</span> },
          {
            header: "Action",
            cell: (v) => (
              <div className="flex flex-col items-start gap-1.5 text-sm">
                {v.status !== "ARCHIVED" && (
                  <Link href={`/dashboard/fleet/${v.id}`} className="flex items-center gap-1.5 text-heading hover:text-primary">
                    <Pencil aria-hidden className="size-3.5" /> Edit
                  </Link>
                )}
                {(v.status === "DRAFT" || v.status === "INACTIVE") && (
                  <button type="button" className="text-heading hover:text-primary" onClick={() => changeStatus(v, "ACTIVE")}>Publish</button>
                )}
                {v.status === "ACTIVE" && (
                  <button type="button" className="text-heading hover:text-primary" onClick={() => changeStatus(v, "INACTIVE")}>Unlist</button>
                )}
                {v.status !== "ARCHIVED" && (
                  <button type="button" className="text-danger-strong hover:underline" onClick={() => setArchiving(v)}>Archive</button>
                )}
                {v.status === "ACTIVE" && (
                  <Link href={`/cars/${v.slug}`} className="text-primary hover:underline">View listing</Link>
                )}
              </div>
            ),
          },
        ]}
      />
      <Pagination page={page} pageCount={Math.ceil(vehicles.data.total / PAGE_SIZE)} onPageChange={setPage} />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this vehicle?"
        description="It will no longer be bookable or editable. Existing bookings are kept."
        confirmLabel="Archive"
        destructive
        pending={setStatus.isPending}
        onConfirm={async () => {
          if (archiving) await changeStatus(archiving, "ARCHIVED");
          setArchiving(null);
        }}
      />
    </Card>
  );
}
