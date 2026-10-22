"use client";

import { loginBody } from "@car-rental/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { applyServerErrors } from "@/shared/lib/form";
import { safeNextPath, useLogin } from "../hooks";

type Values = z.input<typeof loginBody>;

export function LoginForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const login = useLogin();
  const form = useForm<Values, unknown, z.output<typeof loginBody>>({ resolver: zodResolver(loginBody) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      router.replace(next);
      router.refresh();
    } catch (error) {
      applyServerErrors(error, form.setError, ["email", "password"]);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {errors.root && <FormAlert>{errors.root.message}</FormAlert>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} aria-invalid={!!errors.email} aria-describedby="email-message" {...form.register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" placeholder="Your password" aria-invalid={!!errors.password} aria-describedby="password-message" {...form.register("password")} />
      </Field>
      <Link href="/forgot-password" className="-mt-2 self-end text-sm text-heading hover:text-primary">
        Forgot password
      </Link>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Signing in…" : "Login"}
      </Button>
    </form>
  );
}
