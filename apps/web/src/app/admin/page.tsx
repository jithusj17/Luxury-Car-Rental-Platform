import { AdminOverview } from "@/domains/admin/components/admin-overview";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Admin", robots: { index: false } };

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader title="Admin overview" description="Platform health at a glance." />
      <AdminOverview />
    </>
  );
}
