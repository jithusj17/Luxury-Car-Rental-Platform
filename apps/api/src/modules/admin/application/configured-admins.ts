import type { UserRole } from "@car-rental/contracts";
import { isAdmin, type User } from "../../identity/domain/user.ts";
import type { AdminDeps } from "./ports.ts";

/**
 * `ADMIN_EMAILS` grants admin access to the listed accounts, but only once an account has proven
 * it owns the address (verified email). Otherwise anyone could register a listed address first and
 * take over the admin area. The list only adds access: removing an email doesn't demote anyone
 * (use the Users page for that), so a typo in the setting can't lock admins out.
 */
export async function grantConfiguredAdmin(deps: AdminDeps, user: User, adminEmails: string[]): Promise<boolean> {
  if (!user.emailVerifiedAt || isAdmin(user) || !adminEmails.includes(user.email.toLowerCase())) return false;
  const roles: UserRole[] = [...user.roles, "admin"];
  await deps.tx.run(async () => {
    await deps.users.setRoles(user.id, roles);
    // No admin acted, so the account itself is recorded as the actor; `source` says why.
    await deps.audit.record({
      actorId: user.id,
      action: "user.roles_changed",
      targetType: "user",
      targetId: user.id,
      details: { from: user.roles, to: roles, source: "ADMIN_EMAILS" },
    });
  });
  return true;
}

/** Runs at startup: applies the list to accounts that already exist and are verified. */
export async function grantConfiguredAdmins(deps: AdminDeps, adminEmails: string[]): Promise<string[]> {
  const granted: string[] = [];
  for (const email of adminEmails) {
    const user = await deps.users.findByEmailWithPassword(email);
    if (user && (await grantConfiguredAdmin(deps, user, adminEmails))) granted.push(email);
  }
  return granted;
}
