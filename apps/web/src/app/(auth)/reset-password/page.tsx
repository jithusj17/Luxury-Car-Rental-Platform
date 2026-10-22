import { Suspense } from "react";
import { AuthCard } from "@/domains/auth/components/auth-card";
import { ResetPasswordForm } from "@/domains/auth/components/password-reset-forms";

export const metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
