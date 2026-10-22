"use client";

import { useAuth } from "@/domains/auth/hooks";
import { Skeleton } from "@/shared/components/ui/feedback";
import { BecomeHostCard } from "./become-host-card";

/**
 * Hosting pages render only for owners; others get the become-a-host prompt. This is UX only —
 * the API rejects owner endpoints for non-owners regardless.
 */
export function OwnerGate({ children }: { children: React.ReactNode }) {
  const { isOwner, isLoading } = useAuth();
  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  return isOwner ? children : <BecomeHostCard />;
}
