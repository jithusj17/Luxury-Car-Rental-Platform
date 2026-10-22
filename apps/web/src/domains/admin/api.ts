import type {
  AdminBookingListQuery,
  AdminOverview,
  AdminPayment,
  AdminPaymentListQuery,
  AdminUser,
  AdminUserListQuery,
  AdminVehicleListQuery,
  AuditEntry,
  Booking,
  OwnerVehicle,
  Paginated,
  SuspendUserBody,
  UpdateUserRolesBody,
  UpdateVehicleStatusBody,
} from "@car-rental/contracts";
import { apiRequest, toQuery } from "@/shared/api/client";

type Params<T> = Partial<T>;

export const adminApi = {
  overview: () => apiRequest<AdminOverview>("/v1/admin/overview"),
  users: (params: Params<AdminUserListQuery>) => apiRequest<Paginated<AdminUser>>(`/v1/admin/users${toQuery(params)}`),
  setRoles: (id: string, body: UpdateUserRolesBody) => apiRequest<AdminUser>(`/v1/admin/users/${id}/roles`, { method: "PUT", body }),
  setSuspended: (id: string, body: SuspendUserBody) => apiRequest<AdminUser>(`/v1/admin/users/${id}/suspension`, { method: "PUT", body }),
  vehicles: (params: Params<AdminVehicleListQuery>) => apiRequest<Paginated<OwnerVehicle>>(`/v1/admin/vehicles${toQuery(params)}`),
  setVehicleStatus: (id: string, body: UpdateVehicleStatusBody) =>
    apiRequest<OwnerVehicle>(`/v1/admin/vehicles/${id}/status`, { method: "PUT", body }),
  bookings: (params: Params<AdminBookingListQuery>) => apiRequest<Paginated<Booking>>(`/v1/admin/bookings${toQuery(params)}`),
  cancelBooking: (id: string, reason: string) => apiRequest<Booking>(`/v1/admin/bookings/${id}/cancel`, { method: "POST", body: { reason } }),
  payments: (params: Params<AdminPaymentListQuery>) => apiRequest<Paginated<AdminPayment>>(`/v1/admin/payments${toQuery(params)}`),
  auditLog: (params: { page?: number; pageSize?: number }) => apiRequest<Paginated<AuditEntry>>(`/v1/admin/audit-log${toQuery(params)}`),
};
