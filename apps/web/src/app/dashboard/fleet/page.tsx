import { Plus } from "lucide-react";
import Link from "next/link";
import { FleetView } from "@/domains/owner/components/fleet-view";
import { OwnerGate } from "@/domains/owner/components/owner-gate";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "My fleet" };

export default function FleetPage() {
  return (
    <>
      <PageHeader
        title="My fleet"
        actions={
          <Button asChild>
            <Link href="/dashboard/fleet/new"><Plus aria-hidden /> Add vehicle</Link>
          </Button>
        }
      />
      <OwnerGate>
        <FleetView />
      </OwnerGate>
    </>
  );
}
