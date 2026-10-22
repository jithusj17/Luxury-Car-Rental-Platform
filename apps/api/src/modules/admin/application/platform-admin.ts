import type { AdminBookingListQuery, AdminOverview, AdminPaymentListQuery, AdminVehicleListQuery, UpdateVehicleStatusBody } from "@car-rental/contracts";
import { cancelBooking } from "../../bookings/application/booking-lifecycle.ts";
import { listBookingsForAdmin } from "../../bookings/application/booking-queries.ts";
import type { User } from "../../identity/domain/user.ts";
import { changeVehicleStatus } from "../../vehicles/application/owner-vehicle-use-cases.ts";
import type { AdminDeps } from "./ports.ts";

export async function getOverview(deps: AdminDeps): Promise<AdminOverview> {
  const [users, vehicles, bookings, refundedCents] = await Promise.all([
    deps.users.countSummary(),
    deps.vehicles.vehicles.countSummary(),
    deps.bookings.bookings.adminStats(),
    deps.payments.refundedTotalCents(),
  ]);
  return {
    users,
    vehicles,
    bookings: {
      total: bookings.total,
      pendingPayment: bookings.byStatus.PENDING_PAYMENT,
      confirmed: bookings.byStatus.CONFIRMED,
      cancelled: bookings.byStatus.CANCELLED,
      expired: bookings.byStatus.EXPIRED,
    },
    revenue: {
      currency: "USD",
      grossBookingsCents: bookings.confirmedTotalCents,
      serviceFeesCents: bookings.confirmedServiceFeeCents,
      refundedCents,
    },
  };
}

export async function listVehicles(deps: AdminDeps, query: AdminVehicleListQuery) {
  const { page, pageSize, ...filter } = query;
  const result = await deps.vehicles.vehicles.listForAdmin(filter, { page, pageSize });
  const owners = await deps.users.findNames(result.items.map((v) => v.ownerId));
  return { items: result.items.map((vehicle) => ({ vehicle, ownerName: owners.get(vehicle.ownerId) ?? "Host" })), total: result.total };
}

/** Uses the vehicles module's own transition rules (e.g. archived is final). */
export async function setVehicleStatus(deps: AdminDeps, admin: User, vehicleId: string, body: UpdateVehicleStatusBody) {
  return deps.tx.run(async () => {
    const vehicle = await changeVehicleStatus(deps.vehicles, admin, vehicleId, body);
    await deps.audit.record({ actorId: admin.id, action: "vehicle.status_changed", targetType: "vehicle", targetId: vehicleId, details: { status: body.status } });
    return vehicle;
  });
}

export function listBookings(deps: AdminDeps, query: AdminBookingListQuery) {
  const { page, pageSize, ...filter } = query;
  return listBookingsForAdmin(deps.bookings, filter, { page, pageSize });
}

/** Admin cancellations follow the platform policy for admins: a full refund of anything paid. */
export async function cancelBookingAsAdmin(deps: AdminDeps, admin: User, bookingId: string, reason: string) {
  return deps.tx.run(async () => {
    const booking = await cancelBooking(deps.bookings, admin, bookingId, reason, { asAdmin: true });
    await deps.audit.record({ actorId: admin.id, action: "booking.cancelled", targetType: "booking", targetId: bookingId, details: { reason } });
    return booking;
  });
}

export function listPayments(deps: AdminDeps, query: AdminPaymentListQuery) {
  const { page, pageSize, ...filter } = query;
  return deps.payments.listForAdmin(filter, { page, pageSize });
}

export async function listAuditLog(deps: AdminDeps, page: { page: number; pageSize: number }) {
  const result = await deps.audit.list(page);
  const names = await deps.users.findNames(result.items.map((e) => e.actorId));
  return { items: result.items.map((entry) => ({ entry, actorName: names.get(entry.actorId) ?? "Admin" })), total: result.total };
}
