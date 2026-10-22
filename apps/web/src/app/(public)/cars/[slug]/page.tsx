import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingWidget } from "@/domains/bookings/components/booking-widget";
import { getVehicle } from "@/domains/vehicles/api.server";
import { VehicleGallery } from "@/domains/vehicles/components/vehicle-gallery";
import { VehicleOverview } from "@/domains/vehicles/components/vehicle-overview";
import { VehicleSpecs } from "@/domains/vehicles/components/vehicle-specs";
import { categoryLabels, vehicleTitle } from "@/domains/vehicles/format";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/feedback";

export async function generateMetadata({ params }: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const vehicle = await getVehicle((await params).slug);
  return vehicle ? { title: vehicleTitle(vehicle), description: vehicle.description.slice(0, 160) } : { title: "Vehicle not found" };
}

export default function VehiclePage({ params }: PageProps<"/cars/[slug]">) {
  return (
    <div className="container-site py-8 lg:py-12">
      <Suspense fallback={<VehicleSkeleton />}>
        <VehicleContent params={params} />
      </Suspense>
    </div>
  );
}

async function VehicleContent({ params }: { params: PageProps<"/cars/[slug]">["params"] }) {
  const vehicle = await getVehicle((await params).slug);
  if (!vehicle) notFound();
  const title = vehicleTitle(vehicle);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="text-primary hover:underline">Home</Link> /
          </li>
          <li>
            <Link href="/cars" className="text-primary hover:underline">Browse cars</Link> /
          </li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_410px]">
        <div className="flex min-w-0 flex-col gap-10">
          <VehicleGallery title={title} imageUrls={vehicle.imageUrls} />
          <header className="flex flex-col gap-3">
            <Badge variant="soft" className="self-start">{categoryLabels[vehicle.category]}</Badge>
            <h1 className="text-h2 font-semibold sm:text-h1">{title}</h1>
            <VehicleSpecs vehicle={vehicle} className="text-sm" />
          </header>
          <VehicleOverview vehicle={vehicle} />
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-[122px] lg:self-start">
          <BookingWidget vehicle={vehicle} />
          <section aria-labelledby="host" className="flex items-center gap-4 rounded-xl border border-border p-6">
            <span aria-hidden className="size-16 shrink-0 rounded-full bg-placeholder" />
            <div>
              <p className="text-xs">Hosted by</p>
              <h2 id="host" className="text-h5 font-medium">{vehicle.owner.name}</h2>
              <p className="text-sm">Pick-up in {vehicle.city}</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function VehicleSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_410px]" aria-busy>
      <div className="flex flex-col gap-6">
        <Skeleton className="aspect-video rounded-xl" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
