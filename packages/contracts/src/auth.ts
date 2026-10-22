import { z } from "zod";

const email = z.email().max(254).transform((value) => value.trim().toLowerCase());

/** NIST 800-63B style: length over composition rules. */
export const newPassword = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

export const registerBody = z.object({
  email,
  password: newPassword,
  fullName: z.string().trim().min(2).max(100),
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type LoginBody = z.infer<typeof loginBody>;

export const forgotPasswordBody = z.object({ email });
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;

export const resetPasswordBody = z.object({
  token: z.string().min(20).max(200),
  password: newPassword,
});
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

export const updateProfileBody = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number")
      .nullable(),
  })
  .partial();
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const userRole = z.enum(["renter", "owner", "admin"]);
export type UserRole = z.infer<typeof userRole>;

export const currentUser = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  roles: z.array(userRole),
  /** True once the user has opened the link emailed to them. */
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type CurrentUser = z.infer<typeof currentUser>;

export const verifyEmailBody = z.object({ token: z.string().min(20).max(200) });
export type VerifyEmailBody = z.infer<typeof verifyEmailBody>;
