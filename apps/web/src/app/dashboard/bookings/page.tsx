import { BookingsListView } from "@/domains/bookings/components/bookings-list-view";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "My bookings" };

export default function MyBookingsPage() {
  return (
    <>
      <PageHeader title="My bookings" />
      <BookingsListView perspective="renter" />
    </>
  );
}
