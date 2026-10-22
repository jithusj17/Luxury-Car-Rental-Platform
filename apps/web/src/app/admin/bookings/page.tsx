import { BookingsAdmin } from "@/domains/admin/components/bookings-admin";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Admin · Bookings", robots: { index: false } };

export default function AdminBookingsAdminPage() {
  return (
    <>
      <PageHeader title="Bookings" description="Every booking. Admin cancellations refund the renter in full." />
      <BookingsAdmin />
    </>
  );
}
