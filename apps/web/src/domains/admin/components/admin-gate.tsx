"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/domains/auth/hooks";
import { Button } from "@/shared/components/ui/button";
import { EmptyState, Skeleton } from "@/shared/components/ui/feedback";

/** Admin pages render only for admins. UX only — every admin API call is checked on the server. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!user?.roles.includes("admin")) {
    return (
      <EmptyState
        icon={<ShieldAlert />}
        title="Admins only"
        description="Your account doesn't have access to the admin area."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }
  return children;
}
