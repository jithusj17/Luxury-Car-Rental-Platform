import type {
  AvailabilityResponse,
  Booking,
  BookingListQuery,
  CreateBookingBody,
  Paginated,
  QuoteResponse,
} from "@car-rental/contracts";
import { apiRequest, toQuery } from "@/shared/api/client";

export type BookingListParams = Partial<BookingListQuery>;

export const bookingsApi = {
  availability: (vehicleId: string, from: string, to: string, signal?: AbortSignal) =>
    apiRequest<AvailabilityResponse>(`/v1/availability${toQuery({ vehicleId, from, to })}`, { signal }),
  quote: (vehicleId: string, pickupDate: string, returnDate: string, signal?: AbortSignal) =>
    apiRequest<QuoteResponse>(`/v1/bookings/quote${toQuery({ vehicleId, pickupDate, returnDate })}`, { signal }),
  /** The idempotency key makes a retried submit return the same booking instead of a second hold. */
  create: (body: CreateBookingBody, idempotencyKey: string) =>
    apiRequest<Booking>("/v1/bookings", { method: "POST", body, headers: { "idempotency-key": idempotencyKey } }),
  get: (id: string) => apiRequest<Booking>(`/v1/bookings/${id}`),
  listMine: (params: BookingListParams) => apiRequest<Paginated<Booking>>(`/v1/bookings${toQuery(params)}`),
  listForOwner: (params: BookingListParams) => apiRequest<Paginated<Booking>>(`/v1/owner/bookings${toQuery(params)}`),
  cancel: (id: string, reason?: string) => apiRequest<Booking>(`/v1/bookings/${id}/cancel`, { method: "POST", body: { reason } }),
};
