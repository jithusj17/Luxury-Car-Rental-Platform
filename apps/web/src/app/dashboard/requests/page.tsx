import { BookingsListView } from "@/domains/bookings/components/bookings-list-view";
import { OwnerGate } from "@/domains/owner/components/owner-gate";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Booking requests" };

export default function RequestsPage() {
  return (
    <>
      <PageHeader title="Booking requests" description="Bookings on your vehicles. Paid bookings are confirmed automatically." />
      <OwnerGate>
        <BookingsListView perspective="owner" />
      </OwnerGate>
    </>
  );
}
