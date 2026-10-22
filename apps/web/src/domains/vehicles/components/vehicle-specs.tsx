import type { VehicleSummary } from "@car-rental/contracts";
import { Cog, Fuel, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { fuelLabels, transmissionLabels } from "../format";

/** Icon row under a vehicle title: seats · transmission · fuel. */
export function VehicleSpecs({ vehicle, className }: { vehicle: Pick<VehicleSummary, "seats" | "transmission" | "fuelType">; className?: string }) {
  const items = [
    { icon: Users, label: `${vehicle.seats} seats` },
    { icon: Cog, label: transmissionLabels[vehicle.transmission] },
    { icon: Fuel, label: fuelLabels[vehicle.fuelType] },
  ];
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs", className)}>
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-1">
          <Icon aria-hidden className="size-4 text-icon" />
          {label}
        </li>
      ))}
    </ul>
  );
}
