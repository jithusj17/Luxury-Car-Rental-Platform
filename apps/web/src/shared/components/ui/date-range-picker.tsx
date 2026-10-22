"use client";

import { CalendarDays } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { formatShortDate, fromIsoDate, toIsoDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";
import { fieldControlClasses } from "./input";

export type IsoRange = { start?: string; end?: string };

type DateRangePickerProps = {
  id?: string;
  value: IsoRange;
  onChange: (range: IsoRange) => void;
  /** Days that can't be part of a range (past days, unavailable days). */
  disabled?: Matcher | Matcher[];
  /** Minimum/maximum rental length in nights. */
  minNights?: number;
  maxNights?: number;
  placeholder?: string;
  numberOfMonths?: number;
  onMonthChange?: (month: Date) => void;
  footer?: React.ReactNode;
  className?: string;
  "aria-invalid"?: boolean;
};

/**
 * Pick-up / return range in a popover. Ranges are half-open: the return day itself is free,
 * so a range can end on a day that is booked from that day on.
 */
export function DateRangePicker({
  id,
  value,
  onChange,
  disabled,
  minNights,
  maxNights,
  placeholder = "Pick-up — Return",
  numberOfMonths = 2,
  onMonthChange,
  footer,
  className,
  "aria-invalid": ariaInvalid,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const selected: DateRange | undefined = value.start
    ? { from: fromIsoDate(value.start), to: value.end ? fromIsoDate(value.end) : undefined }
    : undefined;
  const label = value.start && value.end ? `${formatShortDate(value.start)} — ${formatShortDate(value.end)}` : placeholder;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        aria-invalid={ariaInvalid}
        className={cn(fieldControlClasses, "flex h-[46px] items-center justify-between gap-2 text-left", !value.end && "text-icon", className)}
      >
        <span className="truncate">{label}</span>
        <CalendarDays aria-hidden className="size-4 shrink-0 text-heading" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-50 rounded-xl border border-border bg-white p-3 shadow-lg">
          <DayPicker
            mode="range"
            selected={selected}
            onSelect={(range) => {
              const next = { start: range?.from ? toIsoDate(range.from) : undefined, end: range?.to ? toIsoDate(range.to) : undefined };
              if (next.start && next.end === next.start) next.end = undefined;
              onChange(next);
              if (next.start && next.end) setOpen(false);
            }}
            disabled={disabled}
            min={minNights}
            max={maxNights}
            numberOfMonths={numberOfMonths}
            onMonthChange={onMonthChange}
            defaultMonth={selected?.from}
            footer={footer}
            className="rdp-brand"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
