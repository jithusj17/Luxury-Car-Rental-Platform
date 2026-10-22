import type { AdminUserListQuery, SuspendUserBody, UpdateUserRolesBody, UserRole } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import type { User } from "../../identity/domain/user.ts";
import type { AdminDeps } from "./ports.ts";

export function listUsers(deps: AdminDeps, query: AdminUserListQuery) {
  const { page, pageSize, ...filter } = query;
  return deps.users.listForAdmin(filter, { page, pageSize });
}

/** Every account keeps `renter`; owner/admin are toggled. Admins can't remove their own admin role. */
export async function updateUserRoles(deps: AdminDeps, admin: User, userId: string, body: UpdateUserRolesBody): Promise<User> {
  if (userId === admin.id && !body.admin) throw errors.conflict("You can't remove your own admin access");
  const roles: UserRole[] = ["renter", ...(body.owner ? (["owner"] as const) : []), ...(body.admin ? (["admin"] as const) : [])];
  return deps.tx.run(async () => {
    const before = await deps.users.findById(userId);
    const user = await deps.users.setRoles(userId, roles);
    if (!before || !user) throw errors.notFound("User");
    await deps.audit.record({ actorId: admin.id, action: "user.roles_changed", targetType: "user", targetId: userId, details: { from: before.roles, to: roles } });
    return user;
  });
}

/** Suspending signs the user out everywhere and blocks future logins; their bookings are untouched. */
export async function setUserSuspended(deps: AdminDeps, admin: User, userId: string, body: SuspendUserBody): Promise<User> {
  if (userId === admin.id) throw errors.conflict("You can't suspend your own account");
  return deps.tx.run(async () => {
    const user = await deps.users.setSuspended(userId, body.suspended ? deps.clock.now() : null);
    if (!user) throw errors.notFound("User");
    if (body.suspended) await deps.sessions.deleteAllForUser(userId);
    await deps.audit.record({
      actorId: admin.id,
      action: body.suspended ? "user.suspended" : "user.reinstated",
      targetType: "user",
      targetId: userId,
      details: body.reason ? { reason: body.reason } : {},
    });
    return user;
  });
}
