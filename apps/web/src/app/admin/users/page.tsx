import { UsersAdmin } from "@/domains/admin/components/users-admin";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Admin · Users", robots: { index: false } };

export default function AdminUsersAdminPage() {
  return (
    <>
      <PageHeader title="Users" description="Search accounts, change roles, suspend or reinstate." />
      <UsersAdmin />
    </>
  );
}
