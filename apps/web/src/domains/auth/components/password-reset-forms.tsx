"use client";

import { forgotPasswordBody, resetPasswordBody } from "@car-rental/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { applyServerErrors } from "@/shared/lib/form";
import { authApi } from "../api";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.input<typeof forgotPasswordBody>, unknown, z.output<typeof forgotPasswordBody>>({
    resolver: zodResolver(forgotPasswordBody),
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await authApi.forgotPassword(values);
      setSent(true);
    } catch (error) {
      applyServerErrors(error, form.setError, ["email"]);
    }
  });

  if (sent) {
    return <FormAlert variant="success">If an account exists for that email, a reset link is on its way. It expires in one hour.</FormAlert>;
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <p>Enter your account email and we’ll send you a link to choose a new password.</p>
      {errors.root && <FormAlert>{errors.root.message}</FormAlert>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" icon={<Mail />} aria-invalid={!!errors.email} aria-describedby="email-message" {...form.register("email")} />
      </Field>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

const resetSchema = resetPasswordBody
  .omit({ token: true })
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const form = useForm<z.input<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (error) {
      applyServerErrors(error, form.setError, ["password"]);
    }
  });

  if (!token) return <FormAlert>This reset link is incomplete. Request a new one from the sign-in page.</FormAlert>;
  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <FormAlert variant="success">Your password was changed. Please sign in again.</FormAlert>
        <Button asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {errors.root && <FormAlert>{errors.root.message}</FormAlert>}
      <Field label="New password" htmlFor="password" error={errors.password?.message} hint="At least 10 characters.">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="password-message" {...form.register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby="confirmPassword-message" {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
