import { AvailabilityManager } from "@/domains/owner/components/availability-manager";
import { OwnerGate } from "@/domains/owner/components/owner-gate";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Availability" };

export default function AvailabilityPage() {
  return (
    <>
      <PageHeader title="Availability" description="See bookings and block dates when a car isn’t available." />
      <OwnerGate>
        <AvailabilityManager />
      </OwnerGate>
    </>
  );
}
