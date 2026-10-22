"use client";

import { CalendarClock, CircleDollarSign, KeyRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DashboardMetric } from "@/shared/components/ui/dashboard-metric";
import { ErrorState } from "@/shared/components/ui/feedback";
import { formatPrice } from "@/shared/lib/utils";
import { useEarnings } from "../hooks";

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

/** Host earnings: totals plus a simple per-month bar chart (Page Insights panel in 37). */
export function EarningsView() {
  const earnings = useEarnings();
  if (earnings.isError) return <ErrorState action={<Button onClick={() => earnings.refetch()}>Try again</Button>} />;
  const data = earnings.data;
  const money = (cents: number) => formatPrice(cents, data?.currency ?? "USD");
  const max = Math.max(1, ...(data?.byMonth.map((m) => m.earnedCents) ?? []));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardMetric icon={<CircleDollarSign />} label="Earned" value={data && money(data.totalEarnedCents)} loading={!data} hint="Completed and kept after cancellations" />
        <DashboardMetric icon={<CalendarClock />} label="Upcoming" value={data && money(data.upcomingCents)} loading={!data} hint="Confirmed trips not finished yet" />
        <DashboardMetric icon={<KeyRound />} label="Confirmed trips" value={data?.confirmedBookings} loading={!data} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Earnings by month</CardTitle>
        </CardHeader>
        {data && data.byMonth.length === 0 ? (
          <p className="text-sm">Earnings appear here once your first trip is completed.</p>
        ) : (
          <figure>
            <div className="flex h-56 items-end gap-3 border-b border-border" role="img" aria-label="Bar chart of earnings by month">
              {data?.byMonth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs text-heading">{money(m.earnedCents)}</span>
                  <div className="w-full max-w-14 rounded-t-md bg-primary" style={{ height: `${Math.max(4, (m.earnedCents / max) * 180)}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3">
              {data?.byMonth.map((m) => (
                <span key={m.month} className="flex-1 text-center text-xs">{monthLabel(m.month)}</span>
              ))}
            </div>
            <figcaption className="sr-only">
              {data?.byMonth.map((m) => `${monthLabel(m.month)}: ${money(m.earnedCents)}`).join(", ")}
            </figcaption>
          </figure>
        )}
        <p className="mt-6 text-xs">Amounts exclude the platform service fee. Payouts are not automated yet.</p>
      </Card>
    </div>
  );
}
