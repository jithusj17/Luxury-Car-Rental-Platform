"use client";

import { changePasswordBody, updateProfileBody } from "@car-rental/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BecomeHostCard } from "@/domains/owner/components/become-host-card";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/feedback";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { useToast } from "@/shared/components/ui/toast";
import { applyServerErrors } from "@/shared/lib/form";
import { authApi } from "../api";
import { useAuth, useUpdateProfile } from "../hooks";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().max(20),
});

function ProfileForm({ defaults }: { defaults: { fullName: string; phone: string; email: string } }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const form = useForm<z.input<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async ({ fullName, phone }) => {
    try {
      const body = updateProfileBody.parse({ fullName, phone: phone ? phone : null });
      const user = await update.mutateAsync(body);
      form.reset({ fullName: user.fullName, phone: user.phone ?? "" });
      toast.success("Profile updated");
    } catch (error) {
      if (error instanceof z.ZodError) {
        form.setError("phone", { message: error.issues[0]?.message });
      } else {
        applyServerErrors(error, form.setError, ["fullName", "phone"]);
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {errors.root && <FormAlert className="sm:col-span-2">{errors.root.message}</FormAlert>}
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby="fullName-message" {...form.register("fullName")} />
      </Field>
      <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
        <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby="phone-message" {...form.register("phone")} />
      </Field>
      <Field label="Email address" htmlFor="email" hint="Contact support to change your email." className="sm:col-span-2">
        <Input id="email" value={defaults.email} readOnly disabled />
      </Field>
      <div>
        <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting ? "Saving…" : "Save & Update"}</Button>
      </div>
    </form>
  );
}

const passwordSchema = changePasswordBody
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

function ChangePasswordForm() {
  const toast = useToast();
  const form = useForm<z.input<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed", "Other devices have been signed out.");
    } catch (error) {
      applyServerErrors(error, form.setError, ["currentPassword", "newPassword"]);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-5">
      {errors.root && <FormAlert>{errors.root.message}</FormAlert>}
      <Field label="Old password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <PasswordInput id="currentPassword" autoComplete="current-password" aria-invalid={!!errors.currentPassword} aria-describedby="currentPassword-message" {...form.register("currentPassword")} />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="At least 10 characters.">
        <PasswordInput id="newPassword" autoComplete="new-password" aria-invalid={!!errors.newPassword} aria-describedby="newPassword-message" {...form.register("newPassword")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby="confirmPassword-message" {...form.register("confirmPassword")} />
      </Field>
      <div>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Change password"}</Button>
      </div>
    </form>
  );
}

/** 39_Edit profile, minus avatar upload (no file storage yet). */
export function ProfileView() {
  const { user, isOwner } = useAuth();
  if (!user) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Information</CardTitle></CardHeader>
        <ProfileForm defaults={{ fullName: user.fullName, phone: user.phone ?? "", email: user.email }} />
      </Card>
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <ChangePasswordForm />
      </Card>
      {!isOwner && <BecomeHostCard />}
    </div>
  );
}
