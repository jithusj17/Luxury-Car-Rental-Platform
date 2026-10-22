import { DashboardOverview } from "@/domains/bookings/components/dashboard-overview";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <DashboardOverview />
    </>
  );
}
