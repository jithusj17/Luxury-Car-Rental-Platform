import type { UserRole } from "@car-rental/contracts";

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: UserRole[];
  suspendedAt: Date | null;
  createdAt: Date;
};

export type UserWithPassword = User & { passwordHash: string };

export function hasRole(user: Pick<User, "roles">, role: UserRole): boolean {
  return user.roles.includes(role);
}

export function isAdmin(user: Pick<User, "roles">): boolean {
  return user.roles.includes("admin");
}

/** Every account can rent; becoming a host adds the owner role. */
export const DEFAULT_ROLES: UserRole[] = ["renter"];
