"use client";

import { CalendarCheck, CalendarClock, Car, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/domains/auth/hooks";
import { useEarnings, useOwnerVehicles } from "@/domains/owner/hooks";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DashboardMetric } from "@/shared/components/ui/dashboard-metric";
import { EmptyState, Skeleton } from "@/shared/components/ui/feedback";
import { formatPrice } from "@/shared/lib/utils";
import { useBookingList } from "../hooks";
import { BookingsTable } from "./bookings-table";

function HostMetrics() {
  const fleet = useOwnerVehicles({ page: 1, pageSize: 1 });
  const earnings = useEarnings();
  const requests = useBookingList("owner", { scope: "upcoming", page: 1, pageSize: 1 });
  return (
    <>
      <li><DashboardMetric icon={<Car />} label="Vehicles" value={fleet.data?.total} loading={fleet.isPending} /></li>
      <li><DashboardMetric icon={<CalendarCheck />} label="Upcoming rentals" value={requests.data?.total} loading={requests.isPending} /></li>
      <li>
        <DashboardMetric
          icon={<CircleDollarSign />}
          label="Earned"
          value={earnings.data && formatPrice(earnings.data.totalEarnedCents, earnings.data.currency)}
          loading={earnings.isPending}
        />
      </li>
    </>
  );
}

/** Dashboard home (37): key numbers and the next trips. */
export function DashboardOverview() {
  const { user, isOwner } = useAuth();
  const upcoming = useBookingList("renter", { scope: "upcoming", page: 1, pageSize: 5 });

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li>
          <DashboardMetric icon={<CalendarClock />} label="Upcoming trips" value={upcoming.data?.total} loading={upcoming.isPending} />
        </li>
        {isOwner && <HostMetrics />}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming trips</CardTitle>
          <Link href="/dashboard/bookings" className="text-sm font-medium text-primary hover:underline">See all</Link>
        </CardHeader>
        {upcoming.isPending ? (
          <Skeleton className="h-40" />
        ) : upcoming.data && upcoming.data.items.length > 0 ? (
          <BookingsTable bookings={upcoming.data.items} perspective="renter" />
        ) : (
          <EmptyState
            icon={<CalendarClock />}
            title={user ? `No trips yet, ${user.fullName.split(" ")[0]}` : "No trips yet"}
            description="When you book a car, your upcoming trips will show up here."
            action={<Button asChild><Link href="/cars">Find a car</Link></Button>}
          />
        )}
      </Card>
    </div>
  );
}
