import { PaymentsAdmin } from "@/domains/admin/components/payments-admin";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Admin · Payments", robots: { index: false } };

export default function AdminPaymentsAdminPage() {
  return (
    <>
      <PageHeader title="Payments" description="Payment attempts and refunds." />
      <PaymentsAdmin />
    </>
  );
}
