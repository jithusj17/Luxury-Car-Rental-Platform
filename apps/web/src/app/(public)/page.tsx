import type { VehicleCategory } from "@car-rental/contracts";
import { ArrowRight, CarFront, KeyRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { searchVehicles } from "@/domains/vehicles/api.server";
import { HeroSearch } from "@/domains/vehicles/components/hero-search";
import { VehicleCard } from "@/domains/vehicles/components/vehicle-card";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { categoryLabels } from "@/domains/vehicles/format";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/feedback";

const featuredCategories: VehicleCategory[] = ["sedan", "suv", "hatchback", "van", "convertible", "luxury"];

export default function HomePage() {
  return (
    <>
      {/* Hero: background photo deferred; the grey block + overlay keep the template's layout. */}
      <section className="relative bg-placeholder">
        <div aria-hidden className="absolute inset-0 bg-black/45" />
        <div className="container-site relative flex min-h-[520px] flex-col justify-center gap-8 py-16 lg:min-h-[640px]">
          <div className="flex max-w-3xl flex-col gap-5">
            <h1 className="text-h1 font-semibold text-white sm:text-display">Rent the right car for every trip</h1>
            <p className="max-w-md text-base text-white">Book cars from trusted local hosts. Pick your dates, choose a car, and drive.</p>
          </div>
          <div className="max-w-4xl">
            <HeroSearch />
          </div>
        </div>
      </section>

      <section className="container-site py-16 lg:py-24" aria-labelledby="by-body">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="by-body" className="text-h2 font-medium">Search car by body</h2>
          <ViewAll />
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {featuredCategories.map((category) => (
            <li key={category}>
              <Link href={`/cars?category=${category}`} className="group flex flex-col items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary">
                <VehicleImage src={null} alt="" ratio="thumb" className="w-full rounded-lg" />
                <span className="font-heading font-medium text-heading group-hover:text-primary">{categoryLabels[category]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-primary-soft py-16 lg:py-24" aria-labelledby="popular">
        <div className="container-site">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="popular" className="text-h2 font-medium">Recently listed cars</h2>
            <ViewAll />
          </div>
          <Suspense fallback={<CardsSkeleton />}>
            <RecentVehicles />
          </Suspense>
        </div>
      </section>

      <section className="container-site grid gap-6 py-16 md:grid-cols-2 lg:py-24">
        <Cta icon={<CarFront />} title="Are you looking for a car?" text="Find the right car for your trip, with clear prices and instant confirmation." href="/cars" action="Browse cars" />
        <Cta icon={<KeyRound />} title="Do you want to rent out your car?" text="List your car in minutes, set your own calendar and prices, and earn when it’s booked." href="/dashboard/fleet/new" action="List your car" dark />
      </section>
    </>
  );
}

function ViewAll() {
  return (
    <Link href="/cars" className="flex items-center gap-1 font-heading text-base font-medium text-heading hover:text-primary">
      View all <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

async function RecentVehicles() {
  const { items } = await searchVehicles({ sort: "newest", pageSize: "8" });
  if (items.length === 0) return <p>New cars are on their way. Check back soon.</p>;
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-xl bg-white" />
      ))}
    </div>
  );
}

function Cta({ icon, title, text, href, action, dark }: { icon: React.ReactNode; title: string; text: string; href: string; action: string; dark?: boolean }) {
  return (
    <div className={dark ? "flex flex-col gap-4 rounded-xl bg-primary p-8 text-white" : "flex flex-col gap-4 rounded-xl bg-primary-soft p-8"}>
      <span className={dark ? "text-white [&_svg]:size-10" : "text-primary [&_svg]:size-10"}>{icon}</span>
      <h2 className={dark ? "text-h3 font-medium text-white" : "text-h3 font-medium"}>{title}</h2>
      <p className={dark ? "text-white/90" : ""}>{text}</p>
      <Button asChild variant={dark ? "dark" : "primary"} className="self-start">
        <Link href={href}>
          {action} <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
