import { z } from "zod";
import { currentUser, userRole } from "./auth.ts";
import { bookingStatus } from "./bookings.ts";
import { cents, currency, pageQuery } from "./common.ts";
import { payment, paymentStatus } from "./payments.ts";
import { vehicleStatus } from "./vehicles.ts";

export const adminOverview = z.object({
  users: z.object({ total: z.number().int(), hosts: z.number().int(), admins: z.number().int(), suspended: z.number().int() }),
  vehicles: z.object({ total: z.number().int(), listed: z.number().int() }),
  bookings: z.object({
    total: z.number().int(),
    pendingPayment: z.number().int(),
    confirmed: z.number().int(),
    cancelled: z.number().int(),
    expired: z.number().int(),
  }),
  revenue: z.object({
    currency,
    /** Total charged for confirmed bookings (rental + service fee). */
    grossBookingsCents: cents,
    /** Platform service fees from confirmed bookings. */
    serviceFeesCents: cents,
    /** Money returned to renters. */
    refundedCents: cents,
  }),
});
export type AdminOverview = z.infer<typeof adminOverview>;

export const adminUser = currentUser.extend({ suspendedAt: z.iso.datetime().nullable() });
export type AdminUser = z.infer<typeof adminUser>;

export const adminUserListQuery = pageQuery.extend({
  q: z.string().trim().max(100).optional(),
  role: userRole.optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuery>;

/** Every account keeps the renter role; admins choose whether it is also a host and/or admin. */
export const updateUserRolesBody = z.object({ owner: z.boolean(), admin: z.boolean() });
export type UpdateUserRolesBody = z.infer<typeof updateUserRolesBody>;

export const suspendUserBody = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});
export type SuspendUserBody = z.infer<typeof suspendUserBody>;

export const adminVehicleListQuery = pageQuery.extend({
  q: z.string().trim().max(80).optional(),
  status: vehicleStatus.optional(),
});
export type AdminVehicleListQuery = z.infer<typeof adminVehicleListQuery>;

export const adminBookingListQuery = pageQuery.extend({ status: bookingStatus.optional() });
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuery>;

export const adminCancelBookingBody = z.object({ reason: z.string().trim().min(3, "Give a short reason").max(500) });
export type AdminCancelBookingBody = z.infer<typeof adminCancelBookingBody>;

export const adminPayment = payment.omit({ clientSecret: true }).extend({ renterId: z.uuid() });
export type AdminPayment = z.infer<typeof adminPayment>;

export const adminPaymentListQuery = pageQuery.extend({ status: paymentStatus.optional() });
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuery>;

export const auditEntry = z.object({
  id: z.uuid(),
  actor: z.object({ id: z.uuid(), name: z.string() }),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
});
export type AuditEntry = z.infer<typeof auditEntry>;
