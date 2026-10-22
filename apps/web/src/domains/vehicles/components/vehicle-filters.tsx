"use client";

import { LayoutGrid, List, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-range-picker";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { todayIso, toIsoDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";
import { categoryLabels, fuelLabels, toOptions, transmissionLabels } from "../format";

const ANY = "any";
const withAny = (label: string, options: { value: string; label: string }[]) => [{ value: ANY, label }, ...options];

const sortOptions = [
  { value: "recommended", label: "Sort by: Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];
const seatOptions = withAny("Seats", ["2", "4", "5", "7"].map((s) => ({ value: s, label: `${s}+ seats` })));
const priceOptions = withAny(
  "Max price",
  [5000, 7500, 10000, 15000].map((c) => ({ value: String(c), label: `Up to $${c / 100}/day` })),
);

/**
 * `VehicleFilters`: every filter lives in the URL, so results are shareable, survive reloads,
 * and render on the server. Changing a filter resets to page 1.
 */
export function VehicleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const commitCity = () => city.trim() !== (params.get("city") ?? "") && update({ city: city.trim() || undefined });
  const debouncedQ = useDebounce(q, 400);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === ANY) next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if ((params.get("q") ?? "") !== debouncedQ) update({ q: debouncedQ.trim() || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debouncedQ]);

  const select = (key: string, options: { value: string; label: string }[], label: string) => (
    <Select aria-label={label} value={params.get(key) ?? (key === "sort" ? "recommended" : ANY)} onValueChange={(v) => update({ [key]: v })} options={options} className="h-[42px] rounded-full" />
  );
  const view = params.get("view") === "list" ? "list" : "grid";
  const hasFilters = ["q", "city", "category", "transmission", "fuelType", "seatsMin", "priceMaxCents", "pickupDate"].some((k) => params.has(k));

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr]">
        <Input aria-label="Search make or model" placeholder="Search make or model" icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} className="rounded-full" />
        <Input
          aria-label="City"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onBlur={commitCity}
          onKeyDown={(e) => e.key === "Enter" && commitCity()}
          className="rounded-full"
        />
        <DateRangePicker
          value={{ start: params.get("pickupDate") ?? undefined, end: params.get("returnDate") ?? undefined }}
          onChange={(r) => (r.start && r.end) || (!r.start && !r.end) ? update({ pickupDate: r.start, returnDate: r.end }) : undefined}
          disabled={(date: Date) => toIsoDate(date) < todayIso()}
          placeholder="Available between…"
          className="rounded-full"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 [&>*]:w-auto [&>*]:min-w-36">
        {select("category", withAny("Body type", toOptions(categoryLabels)), "Body type")}
        {select("transmission", withAny("Transmission", toOptions(transmissionLabels)), "Transmission")}
        {select("fuelType", withAny("Fuel", toOptions(fuelLabels)), "Fuel")}
        {select("seatsMin", seatOptions, "Seats")}
        {select("priceMaxCents", priceOptions, "Maximum price")}
        {select("sort", sortOptions, "Sort")}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setCity(""); router.replace(pathname); }}>
            <X aria-hidden /> Clear
          </Button>
        )}
        <div className="ml-auto flex !min-w-0 gap-2" role="group" aria-label="Layout">
          {(["grid", "list"] as const).map((mode) => (
            <Button
              key={mode}
              variant={view === mode ? "primary" : "secondary"}
              size="icon-sm"
              aria-pressed={view === mode}
              aria-label={mode === "grid" ? "Grid view" : "List view"}
              onClick={() => update({ view: mode === "grid" ? undefined : "list", page: params.get("page") ?? undefined })}
              className="rounded-md"
            >
              {mode === "grid" ? <LayoutGrid /> : <List />}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
