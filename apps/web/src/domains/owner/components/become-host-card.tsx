"use client";

import { KeyRound } from "lucide-react";
import { useBecomeOwner } from "@/domains/auth/hooks";
import { errorMessage } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/ui/form-alert";

/** Shown on hosting pages to accounts without the owner role. */
export function BecomeHostCard({ compact = false }: { compact?: boolean }) {
  const becomeOwner = useBecomeOwner();
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl bg-primary-soft p-6 sm:p-8">
      <span className="flex size-14 items-center justify-center rounded-full bg-white text-primary">
        <KeyRound aria-hidden className="size-6" />
      </span>
      <h2 className="text-h3 font-medium">Earn by sharing your car</h2>
      {!compact && <p className="max-w-lg">Become a host to list vehicles, manage their calendar, and accept bookings. You can still rent cars with the same account.</p>}
      {becomeOwner.isError && <FormAlert>{errorMessage(becomeOwner.error)}</FormAlert>}
      <Button onClick={() => becomeOwner.mutate()} disabled={becomeOwner.isPending}>
        {becomeOwner.isPending ? "Setting up…" : "Become a host"}
      </Button>
    </div>
  );
}
