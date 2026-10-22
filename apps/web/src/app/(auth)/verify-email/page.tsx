import { Suspense } from "react";
import { AuthCard } from "@/domains/auth/components/auth-card";
import { VerifyEmailConfirm } from "@/domains/auth/components/email-verification";

export const metadata = { title: "Verify your email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Verify your email">
      <Suspense>
        <VerifyEmailConfirm />
      </Suspense>
    </AuthCard>
  );
}
