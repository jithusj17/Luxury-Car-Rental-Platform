import Link from "next/link";
import { Suspense } from "react";
import { BookingDetailView } from "@/domains/bookings/components/booking-detail-view";
import { Skeleton } from "@/shared/components/ui/feedback";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Booking" };

export default function BookingPage({ params }: PageProps<"/dashboard/bookings/[id]">) {
  return (
    <>
      <PageHeader
        title="Booking details"
        actions={
          <Link href="/dashboard/bookings" className="text-sm font-medium text-primary hover:underline">
            ← All bookings
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function Content({ params }: { params: PageProps<"/dashboard/bookings/[id]">["params"] }) {
  return <BookingDetailView bookingId={(await params).id} />;
}
