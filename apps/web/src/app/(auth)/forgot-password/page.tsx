import Link from "next/link";
import { AuthCard } from "@/domains/auth/components/auth-card";
import { ForgotPasswordForm } from "@/domains/auth/components/password-reset-forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password"
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
