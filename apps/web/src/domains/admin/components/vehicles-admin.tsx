"use client";

import type { OwnerVehicle, VehicleStatus } from "@car-rental/contracts";
import Link from "next/link";
import { useCallback, useState } from "react";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { vehicleTitle } from "@/domains/vehicles/format";
import { errorMessage } from "@/shared/api/api-error";
import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DataTable } from "@/shared/components/ui/data-table";
import { ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { Pagination } from "@/shared/components/ui/pagination";
import { useToast } from "@/shared/components/ui/toast";
import { formatPrice } from "@/shared/lib/utils";
import { useAdminVehicles, useSetVehicleStatus } from "../hooks";
import { ALL, AdminFilter, AdminSearch } from "./admin-filters";

const PAGE_SIZE = 20;
const statusStyle: Record<VehicleStatus, { label: string; variant: BadgeProps["variant"] }> = {
  ACTIVE: { label: "Listed", variant: "success" },
  DRAFT: { label: "Draft", variant: "soft" },
  INACTIVE: { label: "Unlisted", variant: "neutral" },
  ARCHIVED: { label: "Archived", variant: "danger" },
};
const statusOptions = (Object.keys(statusStyle) as VehicleStatus[]).map((s) => ({ value: s, label: statusStyle[s].label }));

/** Every host's listings: unlist problem cars, relist them, or archive permanently. */
export function VehiclesAdmin() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const vehicles = useAdminVehicles({ q: q || undefined, status: status === ALL ? undefined : (status as VehicleStatus), page, pageSize: PAGE_SIZE });
  const setVehicleStatus = useSetVehicleStatus();
  const [archiving, setArchiving] = useState<OwnerVehicle | null>(null);
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  async function change(v: OwnerVehicle, next: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      await setVehicleStatus.mutateAsync({ id: v.id, body: { status: next, version: v.version } });
      toast.success(next === "ACTIVE" ? "Listing restored" : next === "INACTIVE" ? "Listing unlisted" : "Listing archived", vehicleTitle(v));
    } catch (error) {
      toast.error("Couldn't change the listing", errorMessage(error));
    }
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <AdminSearch label="Search make, model or city" onSearch={onSearch} />
        <AdminFilter label="Statuses" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statusOptions} />
      </div>
      {vehicles.isPending ? (
        <Skeleton className="h-64" />
      ) : vehicles.isError ? (
        <ErrorState action={<Button onClick={() => vehicles.refetch()}>Try again</Button>} />
      ) : (
        <>
          <p className="text-sm"><span className="font-semibold text-primary">{vehicles.data.total}</span> cars</p>
          <DataTable
            caption="All vehicles"
            rows={vehicles.data.items}
            rowKey={(v) => v.id}
            columns={[
              {
                header: "Car",
                cell: (v) => (
                  <div className="flex items-center gap-4">
                    <VehicleImage src={v.imageUrl} alt="" ratio="thumb" className="w-24 shrink-0 rounded-lg" sizes="96px" />
                    <div>
                      <p className="font-heading font-medium text-heading">{vehicleTitle(v)}</p>
                      <p className="text-xs">{v.city} · {formatPrice(v.dailyRateCents, v.currency)}/day</p>
                    </div>
                  </div>
                ),
              },
              { header: "Host", cell: (v) => <span className="text-sm text-heading">{v.owner.name}</span> },
              { header: "Status", cell: (v) => <Badge variant={statusStyle[v.status].variant}>{statusStyle[v.status].label}</Badge> },
              {
                header: "Action",
                cell: (v) => (
                  <div className="flex flex-col items-start gap-1.5 text-sm">
                    {v.status === "ACTIVE" && <button type="button" className="text-heading hover:text-primary" onClick={() => change(v, "INACTIVE")}>Unlist</button>}
                    {v.status === "INACTIVE" && <button type="button" className="text-heading hover:text-primary" onClick={() => change(v, "ACTIVE")}>Relist</button>}
                    {v.status !== "ARCHIVED" && <button type="button" className="text-danger-strong hover:underline" onClick={() => setArchiving(v)}>Archive</button>}
                    {v.status === "ACTIVE" && <Link href={`/cars/${v.slug}`} className="text-primary hover:underline">View listing</Link>}
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={page} pageCount={Math.ceil(vehicles.data.total / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archive this listing?"
        description="Archiving is permanent: the car can't be booked or edited again. Existing bookings are kept."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        destructive
        pending={setVehicleStatus.isPending}
        onConfirm={async () => {
          if (archiving) await change(archiving, "ARCHIVED");
          setArchiving(null);
        }}
      />
    </Card>
  );
}
