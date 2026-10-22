"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { vehicleTitle } from "@/domains/vehicles/format";
import { errorMessage } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DateRangePicker, type IsoRange } from "@/shared/components/ui/date-range-picker";
import { EmptyState, Skeleton } from "@/shared/components/ui/feedback";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { formatShortDate, todayIso, toIsoDate } from "@/shared/lib/dates";
import { useCalendarMutations, useOwnerCalendar, useOwnerVehicles } from "../hooks";
import { MonthCalendar, monthGrid, shiftMonth, startOfMonth } from "./month-calendar";

/** Owner availability: see bookings per vehicle and block dates (maintenance, personal use). */
export function AvailabilityManager() {
  const vehicles = useOwnerVehicles({ page: 1, pageSize: 50 });
  const [selected, setSelected] = useState<string>();
  const vehicleId = selected ?? vehicles.data?.items.find((v) => v.status !== "ARCHIVED")?.id;
  const [month, setMonth] = useState(() => startOfMonth(todayIso()));
  const grid = monthGrid(month);
  const calendar = useOwnerCalendar(vehicleId, grid[0]!, grid.at(-1)!);
  const { createBlock, deleteBlock } = useCalendarMutations();
  const [range, setRange] = useState<IsoRange>({});
  const [note, setNote] = useState("");

  if (vehicles.isPending) return <Skeleton className="h-96 rounded-xl" />;
  const options = (vehicles.data?.items ?? []).filter((v) => v.status !== "ARCHIVED").map((v) => ({ value: v.id, label: vehicleTitle(v) }));
  if (options.length === 0) {
    return <EmptyState title="No vehicles yet" description="Add a vehicle to manage its calendar." action={<Button asChild><Link href="/dashboard/fleet/new">Add a vehicle</Link></Button>} />;
  }

  async function addBlock(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicleId || !range.start || !range.end) return;
    await createBlock.mutateAsync({ vehicleId, startDate: range.start, endDate: range.end, note: note.trim() || undefined }).catch(() => undefined);
    setRange({});
    setNote("");
  }

  const blocks = (calendar.data?.entries ?? []).filter((e) => e.kind === "OWNER_BLOCK");
  const monthLabel = new Date(`${month}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="w-full sm:w-72">
            <Select aria-label="Vehicle" value={vehicleId} onValueChange={setSelected} options={options} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon-sm" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))}><ChevronLeft /></Button>
            <span className="min-w-36 text-center font-heading font-medium text-heading" aria-live="polite">{monthLabel}</span>
            <Button variant="secondary" size="icon-sm" aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))}><ChevronRight /></Button>
          </div>
        </div>
        {calendar.isPending ? <Skeleton className="h-96" /> : <MonthCalendar month={month} entries={calendar.data?.entries ?? []} />}
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle>Block dates</CardTitle></CardHeader>
          <form onSubmit={addBlock} className="flex flex-col gap-4">
            <Field label="Dates" htmlFor="block-dates">
              <DateRangePicker id="block-dates" value={range} onChange={setRange} numberOfMonths={1} disabled={(d: Date) => toIsoDate(d) < todayIso()} placeholder="From — Until" />
            </Field>
            <Field label="Note (optional)" htmlFor="block-note">
              <Input id="block-note" maxLength={200} placeholder="e.g. Service" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {createBlock.isError && <FormAlert>{errorMessage(createBlock.error)}</FormAlert>}
            <Button type="submit" disabled={!range.end || createBlock.isPending}>{createBlock.isPending ? "Blocking…" : "Block these dates"}</Button>
          </form>
        </Card>
        <Card>
          <CardHeader><CardTitle>Blocks this month</CardTitle></CardHeader>
          {blocks.length === 0 ? (
            <p className="text-sm">No blocked dates.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-heading font-medium text-heading">{formatShortDate(b.startDate)} – {formatShortDate(b.endDate)}</p>
                    <p className="text-xs">{b.label}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove block ${b.startDate}`} onClick={() => deleteBlock.mutate(b.id)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
