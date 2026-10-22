import { AdminGate } from "@/domains/admin/components/admin-gate";
import { DashboardShell } from "@/shell/dashboard-shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <DashboardShell area="admin">
      <AdminGate>{children}</AdminGate>
    </DashboardShell>
  );
}
