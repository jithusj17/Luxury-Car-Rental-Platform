import type { VehicleSummary } from "@car-rental/contracts";
import { Images, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn, formatPrice } from "@/shared/lib/utils";
import { categoryLabels, vehicleTitle } from "../format";
import { VehicleImage } from "./vehicle-image";
import { VehicleSpecs } from "./vehicle-specs";

/** Rental version of the Figma "Card medium" component (300×460). */
export function VehicleCard({ vehicle, href, className }: { vehicle: VehicleSummary; href?: string; className?: string }) {
  const title = vehicleTitle(vehicle);
  const target = href ?? `/cars/${vehicle.slug}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-lg has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primary",
        className,
      )}
    >
      <VehicleImage src={vehicle.imageUrl} alt={title}>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {vehicle.photoCount > 0 ? (
            <Badge variant="overlay">
              <Images aria-hidden />
              <span className="sr-only">Photos:</span>
              {vehicle.photoCount}
            </Badge>
          ) : (
            <span />
          )}
          <Badge>{vehicle.year}</Badge>
        </div>
      </VehicleImage>

      <div className="flex flex-1 flex-col gap-5 p-4">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-sm text-primary">{categoryLabels[vehicle.category]}</p>
          <h3 className="text-h5 font-medium">
            <Link href={target} className="after:absolute after:inset-0 focus-visible:outline-none">
              {title}
            </Link>
          </h3>
          <VehicleSpecs vehicle={vehicle} />
        </div>
        <p className="font-heading">
          <span className="text-h4 font-medium text-primary">{formatPrice(vehicle.dailyRateCents, vehicle.currency)}</span>{" "}
          <span className="text-sm text-body">/ day</span>
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-5">
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-heading text-sm font-medium text-heading">{vehicle.owner.name}</span>
            <span className="flex items-center gap-1 text-xs">
              <MapPin aria-hidden className="size-3.5 text-icon" />
              {vehicle.city}
            </span>
          </div>
          {/* Visual duplicate of the stretched title link, so it's kept out of the tab order. */}
          <Button asChild variant="outline" size="sm" className="relative z-10">
            <Link href={target} tabIndex={-1} aria-hidden>
              View car
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
