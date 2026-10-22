"use client";

import { Button } from "@/shared/components/ui/button";
import { ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { useOwnerVehicle } from "../hooks";
import { VehicleForm } from "./vehicle-form";

export function EditVehicle({ vehicleId }: { vehicleId: string }) {
  const vehicle = useOwnerVehicle(vehicleId);
  if (vehicle.isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (vehicle.isError) return <ErrorState title="Vehicle not found" description="It doesn’t exist or belongs to another host." action={<Button onClick={() => vehicle.refetch()}>Try again</Button>} />;
  if (vehicle.data.status === "ARCHIVED") return <ErrorState title="Archived" description="Archived vehicles can’t be edited." />;
  // Keyed by version so the form re-initialises after a save elsewhere.
  return <VehicleForm key={vehicle.data.version} vehicle={vehicle.data} />;
}
