"use client";

import type { Booking, CreateBookingBody } from "@car-rental/contracts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { isApiError } from "@/shared/api/api-error";
import { bookingsApi, type BookingListParams } from "./api";

export const bookingKeys = {
  all: ["bookings"] as const,
  detail: (id: string) => ["bookings", "detail", id] as const,
  mine: (params: BookingListParams) => ["bookings", "mine", params] as const,
  owner: (params: BookingListParams) => ["bookings", "owner", params] as const,
  availability: (vehicleId: string, from: string, to: string) => ["availability", vehicleId, from, to] as const,
  quote: (vehicleId: string, pickup?: string, ret?: string) => ["quote", vehicleId, pickup, ret] as const,
};

/** `useVehicleAvailability`: unavailable periods for a window. Advisory only — booking re-checks. */
export function useVehicleAvailability(vehicleId: string, from: string, to: string) {
  return useQuery({
    queryKey: bookingKeys.availability(vehicleId, from, to),
    queryFn: ({ signal }) => bookingsApi.availability(vehicleId, from, to, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

/** Server-side price for the selected dates; stale responses are cancelled via AbortSignal. */
export function useQuote(vehicleId: string, pickupDate?: string, returnDate?: string) {
  return useQuery({
    queryKey: bookingKeys.quote(vehicleId, pickupDate, returnDate),
    queryFn: ({ signal }) => bookingsApi.quote(vehicleId, pickupDate!, returnDate!, signal),
    enabled: Boolean(pickupDate && returnDate),
    staleTime: 10_000,
  });
}

/**
 * `useBooking` (create): one idempotency key per booking attempt, reused across retries of that
 * attempt and rotated after success, so double-clicks and network retries can't double-book.
 */
export function useCreateBooking() {
  const keyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBookingBody) => {
      keyRef.current ??= crypto.randomUUID();
      return bookingsApi.create(body, keyRef.current);
    },
    onSuccess: (booking) => {
      keyRef.current = null;
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
      void queryClient.invalidateQueries({ queryKey: ["availability", booking.vehicle.id] });
    },
    onError: (error) => {
      // Business rejections (e.g. dates taken) need a fresh attempt; network errors and 5xx keep
      // the key so a retry is recognised by the server as the same request.
      if (isApiError(error) && error.status < 500) keyRef.current = null;
    },
  });
}

export function useBookingDetail(id: string, options: { pollWhilePending?: boolean } = {}) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingsApi.get(id),
    refetchInterval: (query) => (options.pollWhilePending && query.state.data?.status === "PENDING_PAYMENT" ? 2_000 : false),
  });
}

/** A renter's own bookings, or (for hosts) bookings on their vehicles. */
export function useBookingList(perspective: "renter" | "owner", params: BookingListParams) {
  return useQuery({
    queryKey: perspective === "renter" ? bookingKeys.mine(params) : bookingKeys.owner(params),
    queryFn: () => (perspective === "renter" ? bookingsApi.listMine(params) : bookingsApi.listForOwner(params)),
    placeholderData: keepPreviousData,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => bookingsApi.cancel(id, reason),
    onSuccess: (booking: Booking) => {
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["availability", booking.vehicle.id] });
    },
  });
}
