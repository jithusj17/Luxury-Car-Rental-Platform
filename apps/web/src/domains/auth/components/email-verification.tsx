"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { errorMessage } from "@/shared/api/api-error";
import { useAuth, useResendVerification, useVerifyEmail } from "../hooks";

/**
 * Landing page of the emailed link. Confirming takes a click rather than happening on load, so
 * mail scanners that open links in advance can't verify an address on the owner's behalf.
 */
export function VerifyEmailConfirm() {
  const token = useSearchParams().get("token") ?? "";
  const verify = useVerifyEmail();

  if (!token) return <FormAlert>This verification link is incomplete. Request a new one from your dashboard.</FormAlert>;
  if (verify.isSuccess) {
    return (
      <div className="flex flex-col gap-6">
        <FormAlert variant="success">Thanks, {verify.data.email} is verified.</FormAlert>
        <Button asChild>
          <Link href="/dashboard">Go to my dashboard</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <p>Confirm that this email address belongs to you.</p>
      {verify.isError && <FormAlert>{errorMessage(verify.error)}</FormAlert>}
      <Button onClick={() => verify.mutate(token)} disabled={verify.isPending} className="w-full">
        {verify.isPending ? "Confirming…" : "Confirm my email"}
      </Button>
    </div>
  );
}

/** Dashboard notice for accounts that haven't verified their email yet, with a resend button. */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const resend = useResendVerification();
  if (!user || user.emailVerified) return null;

  return (
    <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-primary-soft px-5 py-4">
      <MailCheck aria-hidden className="size-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-heading">
        {resend.isSuccess ? `We sent a new link to ${user.email}. It expires in 24 hours.` : `Please verify your email: we sent a link to ${user.email}.`}
        {resend.isError && <span className="block text-danger-strong">{errorMessage(resend.error)}</span>}
      </p>
      {!resend.isSuccess && (
        <Button variant="secondary" size="sm" onClick={() => resend.mutate()} disabled={resend.isPending}>
          {resend.isPending ? "Sending…" : "Resend link"}
        </Button>
      )}
    </div>
  );
}
