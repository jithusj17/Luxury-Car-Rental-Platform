import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/domains/auth/components/auth-card";
import { RegisterForm } from "@/domains/auth/components/register-form";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Register"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Login
          </Link>
        </>
      }
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
