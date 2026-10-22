import { EarningsView } from "@/domains/owner/components/earnings-view";
import { OwnerGate } from "@/domains/owner/components/owner-gate";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Earnings" };

export default function EarningsPage() {
  return (
    <>
      <PageHeader title="Earnings" />
      <OwnerGate>
        <EarningsView />
      </OwnerGate>
    </>
  );
}
