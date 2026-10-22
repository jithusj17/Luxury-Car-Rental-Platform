import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/domains/auth/components/auth-card";
import { LoginForm } from "@/domains/auth/components/login-form";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Login"
      footer={
        <>
          Don’t you have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
