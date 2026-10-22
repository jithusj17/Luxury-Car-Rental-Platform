"use client";

import type { VehicleDetail } from "@car-rental/contracts";
import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/domains/auth/hooks";
import { errorMessage, isApiError } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker, type IsoRange } from "@/shared/components/ui/date-range-picker";
import { Skeleton } from "@/shared/components/ui/feedback";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { addDaysIso, todayIso, toIsoDate } from "@/shared/lib/dates";
import { formatPrice } from "@/shared/lib/utils";
import { isRangeFree, makeDayDisabler } from "../availability";
import { useCreateBooking, useQuote, useVehicleAvailability } from "../hooks";
import { BookingSummary } from "./booking-summary";

const WINDOW_DAYS = 180;

/** Sidebar booking card on the vehicle page: dates → server quote → payment hold. */
export function BookingWidget({ vehicle }: { vehicle: VehicleDetail }) {
  const router = useRouter();
  const { user } = useAuth();
  const [range, setRange] = useState<IsoRange>({});
  const [windowStart, setWindowStart] = useState(todayIso);
  const availability = useVehicleAvailability(vehicle.id, windowStart, addDaysIso(windowStart, WINDOW_DAYS));
  const unavailable = useMemo(() => availability.data?.unavailable ?? [], [availability.data]);
  const complete = range.start && range.end ? { start: range.start, end: range.end } : undefined;
  const quote = useQuote(vehicle.id, complete?.start, complete?.end);
  const createBooking = useCreateBooking();
  const isOwnCar = user?.id === vehicle.owner.id;

  const disabled = useMemo(
    () => makeDayDisabler({ today: todayIso(), unavailable, pickup: range.start, awaitingReturn: !range.end, maxNights: vehicle.maxDays }),
    [unavailable, range.start, range.end, vehicle.maxDays],
  );
  const rangeTaken = complete ? !isRangeFree(complete, unavailable) || quote.data?.available === false : false;

  async function reserve() {
    if (!complete) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/cars/${vehicle.slug}`)}`);
      return;
    }
    try {
      const booking = await createBooking.mutateAsync({ vehicleId: vehicle.id, pickupDate: complete.start, returnDate: complete.end });
      router.push(`/checkout/${booking.id}`);
    } catch (error) {
      if (isApiError(error, 409)) void availability.refetch();
    }
  }

  return (
    <section aria-labelledby="booking-widget-title" className="flex flex-col gap-5 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div>
        <h2 id="booking-widget-title" className="sr-only">Book this car</h2>
        <p className="font-heading">
          <span className="text-h2 font-semibold text-primary">{formatPrice(vehicle.dailyRateCents, vehicle.currency)}</span>{" "}
          <span className="text-base">/ day</span>
        </p>
        <p className="text-xs">
          {vehicle.minDays > 1 ? `Minimum ${vehicle.minDays} days · ` : ""}Up to {vehicle.maxDays} days
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="rental-dates" className="font-heading text-sm font-medium text-heading">
          Pick-up — Return
        </label>
        <DateRangePicker
          id="rental-dates"
          value={range}
          onChange={setRange}
          disabled={disabled}
          minNights={vehicle.minDays}
          onMonthChange={(month) => setWindowStart((current) => (toIsoDate(month) > current ? toIsoDate(month) : current))}
          footer={<p className="px-2 pt-2 text-xs">Crossed-out days are already booked. Return by the morning of the return day.</p>}
          aria-invalid={rangeTaken}
        />
      </div>

      {complete && quote.isPending && <Skeleton className="h-24" />}
      {quote.data && <BookingSummary price={quote.data.price} />}
      {quote.isError && <FormAlert>{errorMessage(quote.error)}</FormAlert>}
      {rangeTaken && <FormAlert>Those dates are no longer available. Please choose different dates.</FormAlert>}
      {createBooking.isError && <FormAlert>{errorMessage(createBooking.error)}</FormAlert>}

      <Button onClick={reserve} disabled={!quote.data || rangeTaken || isOwnCar || createBooking.isPending}>
        <CalendarCheck aria-hidden />
        {createBooking.isPending ? "Reserving…" : user ? "Reserve" : "Sign in to reserve"}
      </Button>
      {isOwnCar ? (
        <p className="text-center text-xs">This is your vehicle.</p>
      ) : (
        <p className="text-center text-xs">Your dates are held for 15 minutes while you pay. You won’t be charged yet.</p>
      )}
    </section>
  );
}
