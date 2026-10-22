import { OwnerGate } from "@/domains/owner/components/owner-gate";
import { VehicleForm } from "@/domains/owner/components/vehicle-form";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Add vehicle" };

export default function NewVehiclePage() {
  return (
    <>
      <PageHeader title="Add vehicle" />
      <OwnerGate>
        <VehicleForm />
      </OwnerGate>
    </>
  );
}
