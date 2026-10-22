import type { VehicleSummary } from "@car-rental/contracts";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn, formatPrice } from "@/shared/lib/utils";
import { categoryLabels, vehicleTitle } from "../format";
import { VehicleImage } from "./vehicle-image";
import { VehicleSpecs } from "./vehicle-specs";

/** Horizontal listing row from the Figma "Card list" component (14_Listing list). */
export function VehicleListItem({ vehicle }: { vehicle: VehicleSummary }) {
  const title = vehicleTitle(vehicle);
  const href = `/cars/${vehicle.slug}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-white sm:flex-row">
      <VehicleImage src={vehicle.imageUrl} alt={title} className="sm:w-[300px] sm:shrink-0" sizes="(min-width: 640px) 300px, 100vw">
        <Badge className="absolute top-3 right-3">{vehicle.year}</Badge>
      </VehicleImage>
      <div className="flex flex-1 flex-col gap-4 p-5 md:flex-row md:items-stretch">
        <div className="flex flex-1 flex-col gap-2">
          <p className="font-heading text-sm text-primary">{categoryLabels[vehicle.category]}</p>
          <h3 className="text-h4 font-medium">
            <Link href={href} className="hover:text-primary">
              {title}
            </Link>
          </h3>
          <VehicleSpecs vehicle={vehicle} />
          <p className="mt-2 font-heading">
            <span className="text-h4 font-medium text-primary">{formatPrice(vehicle.dailyRateCents, vehicle.currency)}</span>{" "}
            <span className="text-sm">/ day</span>
          </p>
          <Link href={href} className={cn(buttonVariants({ variant: "outline-primary" }), "mt-auto self-start")} aria-label={`View details of ${title}`}>
            View details <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="flex flex-col justify-between gap-3 border-border md:w-52 md:border-l md:pl-6">
          <div>
            <p className="font-heading font-medium text-heading">{vehicle.owner.name}</p>
            <p className="flex items-center gap-1 text-xs">
              <MapPin aria-hidden className="size-3.5 text-icon" />
              {vehicle.city}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
