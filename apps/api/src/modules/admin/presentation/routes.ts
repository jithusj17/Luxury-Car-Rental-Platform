import {
  adminBookingListQuery,
  adminCancelBookingBody,
  adminOverview,
  adminPayment,
  adminPaymentListQuery,
  adminUser,
  adminUserListQuery,
  adminVehicleListQuery,
  auditEntry,
  booking,
  idParams,
  ownerVehicle,
  pageQuery,
  paginated,
  suspendUserBody,
  updateUserRolesBody,
  updateVehicleStatusBody,
  type AdminPayment,
  type AdminUser,
} from "@car-rental/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getBooking } from "../../bookings/application/booking-queries.ts";
import { toBookingDto } from "../../bookings/presentation/presenters.ts";
import type { User } from "../../identity/domain/user.ts";
import { requireRole } from "../../identity/presentation/auth-guard.ts";
import type { Payment } from "../../payments/domain/payment.ts";
import { toOwnerVehicle } from "../../vehicles/presentation/presenters.ts";
import * as platform from "../application/platform-admin.ts";
import type { AdminDeps } from "../application/ports.ts";
import { listUsers, setUserSuspended, updateUserRoles } from "../application/user-admin.ts";

const toUserDto = (u: User): AdminUser => ({ ...u, createdAt: u.createdAt.toISOString(), suspendedAt: u.suspendedAt?.toISOString() ?? null });
const toPaymentDto = (p: Payment): AdminPayment => ({
  id: p.id,
  bookingId: p.bookingId,
  renterId: p.renterId,
  status: p.status,
  amountCents: p.amountCents,
  refundedCents: p.refundedCents,
  currency: p.currency,
  provider: p.provider,
  failureReason: p.failureReason,
  createdAt: p.createdAt.toISOString(),
});
const tags = ["Admin"];

/** Back-office endpoints. Every route requires the admin role (enforced here, on the server). */
export function adminRoutes(app: FastifyInstance, deps: AdminDeps) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const admin = (request: Parameters<typeof requireRole>[0]) => requireRole(request, "admin").user;

  r.get("/v1/admin/overview", { schema: { tags, response: { 200: adminOverview } } }, async (request) => {
    admin(request);
    return platform.getOverview(deps);
  });

  r.get("/v1/admin/users", { schema: { tags, querystring: adminUserListQuery, response: { 200: paginated(adminUser) } } }, async (request) => {
    admin(request);
    const { items, total } = await listUsers(deps, request.query);
    return { items: items.map(toUserDto), page: request.query.page, pageSize: request.query.pageSize, total };
  });

  r.put("/v1/admin/users/:id/roles", { schema: { tags, params: idParams, body: updateUserRolesBody, response: { 200: adminUser } } }, async (request) => {
    return toUserDto(await updateUserRoles(deps, admin(request), request.params.id, request.body));
  });

  r.put("/v1/admin/users/:id/suspension", { schema: { tags, params: idParams, body: suspendUserBody, response: { 200: adminUser } } }, async (request) => {
    return toUserDto(await setUserSuspended(deps, admin(request), request.params.id, request.body));
  });

  r.get("/v1/admin/vehicles", { schema: { tags, querystring: adminVehicleListQuery, response: { 200: paginated(ownerVehicle) } } }, async (request) => {
    admin(request);
    const { items, total } = await platform.listVehicles(deps, request.query);
    return { items: items.map(({ vehicle, ownerName }) => toOwnerVehicle(vehicle, ownerName)), page: request.query.page, pageSize: request.query.pageSize, total };
  });

  r.put("/v1/admin/vehicles/:id/status", { schema: { tags, params: idParams, body: updateVehicleStatusBody, response: { 200: ownerVehicle } } }, async (request) => {
    const vehicle = await platform.setVehicleStatus(deps, admin(request), request.params.id, request.body);
    const names = await deps.users.findNames([vehicle.ownerId]);
    return toOwnerVehicle(vehicle, names.get(vehicle.ownerId) ?? "Host");
  });

  r.get("/v1/admin/bookings", { schema: { tags, querystring: adminBookingListQuery, response: { 200: paginated(booking) } } }, async (request) => {
    const user = admin(request);
    const { items, total } = await platform.listBookings(deps, request.query);
    const now = deps.clock.now();
    return { items: items.map((view) => toBookingDto(view, user, now)), page: request.query.page, pageSize: request.query.pageSize, total };
  });

  r.post("/v1/admin/bookings/:id/cancel", { schema: { tags, params: idParams, body: adminCancelBookingBody, response: { 200: booking } } }, async (request) => {
    const user = admin(request);
    await platform.cancelBookingAsAdmin(deps, user, request.params.id, request.body.reason);
    return toBookingDto(await getBooking(deps.bookings, user, request.params.id), user, deps.clock.now());
  });

  r.get("/v1/admin/payments", { schema: { tags, querystring: adminPaymentListQuery, response: { 200: paginated(adminPayment) } } }, async (request) => {
    admin(request);
    const { items, total } = await platform.listPayments(deps, request.query);
    return { items: items.map(toPaymentDto), page: request.query.page, pageSize: request.query.pageSize, total };
  });

  r.get("/v1/admin/audit-log", { schema: { tags, querystring: pageQuery, response: { 200: paginated(auditEntry) } } }, async (request) => {
    admin(request);
    const { items, total } = await platform.listAuditLog(deps, request.query);
    return {
      items: items.map(({ entry, actorName }) => ({
        id: entry.id,
        actor: { id: entry.actorId, name: actorName },
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: entry.details,
        createdAt: entry.createdAt.toISOString(),
      })),
      page: request.query.page,
      pageSize: request.query.pageSize,
      total,
    };
  });
}
