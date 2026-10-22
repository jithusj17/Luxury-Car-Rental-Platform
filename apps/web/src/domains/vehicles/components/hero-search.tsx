"use client";

import { MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker, type IsoRange } from "@/shared/components/ui/date-range-picker";
import { Input } from "@/shared/components/ui/input";
import { todayIso, toIsoDate } from "@/shared/lib/dates";

/** Hero search bar from the Home frame: where + when → catalog results. */
export function HeroSearch() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [range, setRange] = useState<IsoRange>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (range.start && range.end) {
      params.set("pickupDate", range.start);
      params.set("returnDate", range.end);
    }
    router.push(`/cars${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={submit} role="search" className="grid gap-3 rounded-xl bg-white p-4 shadow-lg md:grid-cols-[1fr_1.2fr_auto] md:p-5">
      <label className="sr-only" htmlFor="hero-city">City</label>
      <Input id="hero-city" placeholder="Where? e.g. Lisbon" icon={<MapPin />} value={city} onChange={(e) => setCity(e.target.value)} />
      <DateRangePicker value={range} onChange={setRange} disabled={(d: Date) => toIsoDate(d) < todayIso()} placeholder="Pick-up — Return" />
      <Button type="submit">
        <Search aria-hidden /> Search cars
      </Button>
    </form>
  );
}
