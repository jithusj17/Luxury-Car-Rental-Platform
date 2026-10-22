"use client";

import { registerBody } from "@car-rental/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { applyServerErrors } from "@/shared/lib/form";
import { safeNextPath, useRegister } from "../hooks";

const schema = registerBody
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });
type Values = z.input<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const register = useRegister();
  const form = useForm<Values, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    try {
      await register.mutateAsync(values);
      router.replace(next);
      router.refresh();
    } catch (error) {
      applyServerErrors(error, form.setError, ["email", "password", "fullName"]);
    }
  });

  const describe = (name: string, invalid: boolean) => ({ "aria-invalid": invalid, "aria-describedby": `${name}-message` });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {errors.root && <FormAlert>{errors.root.message}</FormAlert>}
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" placeholder="Your name" icon={<UserRound />} {...describe("fullName", !!errors.fullName)} {...form.register("fullName")} />
      </Field>
      <Field label="Email address" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="Email address" icon={<Mail />} {...describe("email", !!errors.email)} {...form.register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 10 characters.">
        <PasswordInput id="password" autoComplete="new-password" placeholder="Your password" {...describe("password", !!errors.password)} {...form.register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" placeholder="Confirm password" {...describe("confirmPassword", !!errors.confirmPassword)} {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating account…" : "Sign Up"}
      </Button>
    </form>
  );
}
