import { AuditLogTable } from "@/domains/admin/components/audit-log-view";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Admin · Audit log", robots: { index: false } };

export default function AdminAuditLogTablePage() {
  return (
    <>
      <PageHeader title="Audit log" description="Every action taken in the admin area." />
      <AuditLogTable />
    </>
  );
}
