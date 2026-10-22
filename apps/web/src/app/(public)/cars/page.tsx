import { CarFront } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { searchVehicles, type CatalogParams } from "@/domains/vehicles/api.server";
import { VehicleCard } from "@/domains/vehicles/components/vehicle-card";
import { VehicleFilters } from "@/domains/vehicles/components/vehicle-filters";
import { VehicleListItem } from "@/domains/vehicles/components/vehicle-list-item";
import { Button } from "@/shared/components/ui/button";
import { EmptyState, Skeleton } from "@/shared/components/ui/feedback";
import { Pagination } from "@/shared/components/ui/pagination";

export const metadata = { title: "Browse cars" };

export default function CarsPage({ searchParams }: PageProps<"/cars">) {
  return (
    <>
      <section className="bg-heading">
        <div className="container-site flex flex-col gap-3 py-14 lg:py-20">
          <h1 className="text-h1 font-semibold text-white lg:text-display">Find your next rental</h1>
          <p className="max-w-lg text-base text-white/70">Compare cars from local hosts. Add your dates to see what’s free.</p>
        </div>
      </section>
      <section className="container-site flex flex-col gap-8 py-12 lg:py-16">
        <Suspense fallback={<Skeleton className="h-28" />}>
          <VehicleFilters />
        </Suspense>
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/cars">["searchParams"] }) {
  const raw = await searchParams;
  const params: CatalogParams = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const result = await searchVehicles({ ...params, pageSize: "12" });
  const pageCount = Math.ceil(result.total / result.pageSize);
  const list = params.view === "list";
  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(page));
    return `/cars?${next.toString()}`;
  };

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={<CarFront />}
        title="No cars match your search"
        description="Try other dates, a different city, or fewer filters."
        action={
          <Button asChild variant="secondary">
            <Link href="/cars">Clear filters</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p aria-live="polite" className="text-sm">
        <span className="font-semibold text-primary">{result.total}</span> {result.total === 1 ? "car" : "cars"} found
      </p>
      {list ? (
        <div className="flex flex-col gap-6">
          {result.items.map((v) => <VehicleListItem key={v.id} vehicle={v} />)}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
        </div>
      )}
      <Pagination page={result.page} pageCount={pageCount} hrefFor={hrefFor} />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
