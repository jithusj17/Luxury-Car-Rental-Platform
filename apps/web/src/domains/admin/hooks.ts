"use client";

import type {
  AdminBookingListQuery,
  AdminPaymentListQuery,
  AdminUserListQuery,
  AdminVehicleListQuery,
  SuspendUserBody,
  UpdateUserRolesBody,
  UpdateVehicleStatusBody,
} from "@car-rental/contracts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "./api";

const list = <T extends object>(name: string, params: T) => ["admin", name, params] as const;

export const useAdminOverview = () => useQuery({ queryKey: ["admin", "overview"], queryFn: adminApi.overview });

export const useAdminUsers = (params: Partial<AdminUserListQuery>) =>
  useQuery({ queryKey: list("users", params), queryFn: () => adminApi.users(params), placeholderData: keepPreviousData });

export const useAdminVehicles = (params: Partial<AdminVehicleListQuery>) =>
  useQuery({ queryKey: list("vehicles", params), queryFn: () => adminApi.vehicles(params), placeholderData: keepPreviousData });

export const useAdminBookings = (params: Partial<AdminBookingListQuery>) =>
  useQuery({ queryKey: list("bookings", params), queryFn: () => adminApi.bookings(params), placeholderData: keepPreviousData });

export const useAdminPayments = (params: Partial<AdminPaymentListQuery>) =>
  useQuery({ queryKey: list("payments", params), queryFn: () => adminApi.payments(params), placeholderData: keepPreviousData });

export const useAuditLog = (params: { page: number; pageSize: number }) =>
  useQuery({ queryKey: list("audit", params), queryFn: () => adminApi.auditLog(params), placeholderData: keepPreviousData });

/** Every admin change refreshes all admin views (counts, lists and the audit log). */
function useAdminMutation<A>(fn: (args: A) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin"] }) });
}

export const useSetUserRoles = () => useAdminMutation(({ id, body }: { id: string; body: UpdateUserRolesBody }) => adminApi.setRoles(id, body));
export const useSetUserSuspended = () =>
  useAdminMutation(({ id, body }: { id: string; body: SuspendUserBody }) => adminApi.setSuspended(id, body));
export const useSetVehicleStatus = () =>
  useAdminMutation(({ id, body }: { id: string; body: UpdateVehicleStatusBody }) => adminApi.setVehicleStatus(id, body));
export const useAdminCancelBooking = () => useAdminMutation(({ id, reason }: { id: string; reason: string }) => adminApi.cancelBooking(id, reason));
