import { Suspense } from "react";
import { Checkout } from "@/domains/bookings/components/checkout";
import { Skeleton } from "@/shared/components/ui/feedback";

export const metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage({ params }: PageProps<"/checkout/[bookingId]">) {
  return (
    <div className="container-site py-10 lg:py-14">
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <CheckoutContent params={params} />
      </Suspense>
    </div>
  );
}

async function CheckoutContent({ params }: { params: PageProps<"/checkout/[bookingId]">["params"] }) {
  const { bookingId } = await params;
  return <Checkout bookingId={bookingId} />;
}
