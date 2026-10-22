"use client";

import { CalendarCheck, Car, CircleDollarSign, Receipt, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DashboardMetric } from "@/shared/components/ui/dashboard-metric";
import { ErrorState } from "@/shared/components/ui/feedback";
import { formatPrice } from "@/shared/lib/utils";
import { useAdminOverview } from "../hooks";
import { AuditLogTable } from "./audit-log-view";

/** Platform health at a glance, plus the latest admin actions. */
export function AdminOverview() {
  const overview = useAdminOverview();
  if (overview.isError) return <ErrorState action={<Button onClick={() => overview.refetch()}>Try again</Button>} />;
  const o = overview.data;
  const money = (cents: number) => formatPrice(cents, o?.revenue.currency ?? "USD");
  const loading = !o;

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li>
          <DashboardMetric icon={<UserRound />} label="Users" value={o?.users.total} loading={loading} hint={o && `${o.users.hosts} hosts · ${o.users.suspended} suspended`} />
        </li>
        <li>
          <DashboardMetric icon={<Car />} label="Listed cars" value={o?.vehicles.listed} loading={loading} hint={o && `${o.vehicles.total} in total`} />
        </li>
        <li>
          <DashboardMetric
            icon={<CalendarCheck />}
            label="Confirmed bookings"
            value={o?.bookings.confirmed}
            loading={loading}
            hint={o && `${o.bookings.pendingPayment} awaiting payment · ${o.bookings.cancelled} cancelled`}
          />
        </li>
        <li>
          <DashboardMetric icon={<Receipt />} label="Gross bookings" value={o && money(o.revenue.grossBookingsCents)} loading={loading} hint="Confirmed bookings, incl. fees" />
        </li>
        <li>
          <DashboardMetric icon={<CircleDollarSign />} label="Service fees" value={o && money(o.revenue.serviceFeesCents)} loading={loading} hint="Platform revenue" />
        </li>
        <li>
          <DashboardMetric icon={<RotateCcw />} label="Refunded" value={o && money(o.revenue.refundedCents)} loading={loading} />
        </li>
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Recent admin actions</CardTitle>
          <Link href="/admin/audit-log" className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
        </CardHeader>
        <AuditLogTable pageSize={5} />
      </Card>
    </div>
  );
}
