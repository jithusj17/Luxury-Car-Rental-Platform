import { VehiclesAdmin } from "@/domains/admin/components/vehicles-admin";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Admin · Vehicles", robots: { index: false } };

export default function AdminVehiclesAdminPage() {
  return (
    <>
      <PageHeader title="Vehicles" description="Every listing on the platform. Unlist or archive problem cars." />
      <VehiclesAdmin />
    </>
  );
}
