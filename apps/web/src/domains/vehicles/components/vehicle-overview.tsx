import type { VehicleDetail } from "@car-rental/contracts";
import { CircleCheck } from "lucide-react";
import { categoryLabels, fuelLabels, transmissionLabels } from "../format";

/** "Car overview" two-column spec table and "Features" checklist from 18_Listing detail. */
export function VehicleOverview({ vehicle }: { vehicle: VehicleDetail }) {
  const specs: [string, string | number][] = [
    ["Make", vehicle.make],
    ["Model", vehicle.model],
    ["Year", vehicle.year],
    ["Body", categoryLabels[vehicle.category]],
    ["Seats", vehicle.seats],
    ["Doors", vehicle.doors],
    ["Transmission", transmissionLabels[vehicle.transmission]],
    ["Fuel", fuelLabels[vehicle.fuelType]],
    ["Color", vehicle.color ?? "—"],
    ["Location", vehicle.city],
  ];

  return (
    <>
      {vehicle.description && (
        <section aria-labelledby="description" className="flex flex-col gap-4">
          <h2 id="description" className="text-h3 font-medium">
            Description
          </h2>
          <p className="text-base whitespace-pre-line">{vehicle.description}</p>
        </section>
      )}

      <section aria-labelledby="overview" className="flex flex-col gap-4">
        <h2 id="overview" className="text-h3 font-medium">
          Car overview
        </h2>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {specs.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-border py-3">
              <dt>{label}</dt>
              <dd className="font-medium text-heading">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {vehicle.features.length > 0 && (
        <section aria-labelledby="features" className="flex flex-col gap-4">
          <h2 id="features" className="text-h3 font-medium">
            Features
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicle.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-heading">
                <CircleCheck aria-hidden className="size-5 fill-success text-white" />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
