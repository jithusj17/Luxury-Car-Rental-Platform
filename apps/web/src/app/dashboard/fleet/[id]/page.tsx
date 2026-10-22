import { Suspense } from "react";
import { EditVehicle } from "@/domains/owner/components/edit-vehicle";
import { OwnerGate } from "@/domains/owner/components/owner-gate";
import { Skeleton } from "@/shared/components/ui/feedback";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Edit vehicle" };

export default function EditVehiclePage({ params }: PageProps<"/dashboard/fleet/[id]">) {
  return (
    <>
      <PageHeader title="Edit vehicle" />
      <OwnerGate>
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <Content params={params} />
        </Suspense>
      </OwnerGate>
    </>
  );
}

async function Content({ params }: { params: PageProps<"/dashboard/fleet/[id]">["params"] }) {
  return <EditVehicle vehicleId={(await params).id} />;
}
