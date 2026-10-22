"use client";

import type { BookingScope } from "@car-rental/contracts";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { Pagination } from "@/shared/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useBookingList } from "../hooks";
import { BookingsTable } from "./bookings-table";

const PAGE_SIZE = 10;
const scopes: { value: BookingScope; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past & cancelled" },
  { value: "all", label: "All" },
];

/** Renter's trips or host's incoming bookings, with scope tabs and pagination. */
export function BookingsListView({ perspective }: { perspective: "renter" | "owner" }) {
  const [scope, setScope] = useState<BookingScope>("upcoming");
  const [page, setPage] = useState(1);
  const query = useBookingList(perspective, { scope, page, pageSize: PAGE_SIZE });

  return (
    <Card>
      <Tabs
        value={scope}
        onValueChange={(value) => {
          setScope(value as BookingScope);
          setPage(1);
        }}
      >
        <TabsList aria-label="Booking scope" className="mb-6">
          {scopes.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState action={<Button onClick={() => query.refetch()}>Try again</Button>} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title={perspective === "renter" ? "No trips here yet" : "No bookings here yet"}
          description={perspective === "renter" ? "When you book a car, it will show up here." : "Bookings on your vehicles will show up here."}
          action={
            perspective === "renter" && (
              <Button asChild>
                <Link href="/cars">Find a car</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm" aria-live="polite">
            <span className="font-semibold text-primary">{query.data.total}</span> {query.data.total === 1 ? "result" : "results"} found
          </p>
          <BookingsTable bookings={query.data.items} perspective={perspective} />
          <Pagination page={page} pageCount={Math.ceil(query.data.total / PAGE_SIZE)} onPageChange={setPage} />
        </div>
      )}
    </Card>
  );
}
