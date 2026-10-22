import type { BookingScope, BookingStatus, Currency } from "@car-rental/contracts";
import type { Clock } from "../../../shared/clock.ts";
import type { TransactionManager } from "../../../shared/db/transaction.ts";
import type { Metrics } from "../../../shared/observability/metrics.ts";
import type { EmailQueue } from "../../notifications/application/email.ts";
import type { Booking } from "../domain/booking.ts";
import type { Period } from "../domain/calendar-dates.ts";

export type NewBooking = Omit<Booking, "confirmedAt" | "cancelledAt" | "cancelledBy" | "cancellationReason" | "refundPercent" | "createdAt">;
export type BookingPatch = Partial<
  Pick<Booking, "status" | "holdExpiresAt" | "confirmedAt" | "cancelledAt" | "cancelledBy" | "cancellationReason" | "refundPercent">
>;
export type BookingListFilter = { scope: BookingScope; status?: BookingStatus; vehicleId?: string; today: string };
export type Page = { page: number; pageSize: number };

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  /** Row-locks the booking for the rest of the current transaction. */
  findByIdForUpdate(id: string): Promise<Booking | null>;
  findByRenterKey(renterId: string, idempotencyKey: string): Promise<Booking | null>;
  /** @throws DuplicateIdempotencyKeyError */
  insert(booking: NewBooking): Promise<Booking>;
  update(id: string, patch: BookingPatch): Promise<Booking>;
  /** Marks lapsed holds overlapping `period` EXPIRED and frees their calendar rows. */
  expireLapsedHoldsOverlapping(vehicleId: string, period: Period, now: Date): Promise<string[]>;
  findLapsedHoldIds(now: Date, limit: number): Promise<string[]>;
  listForRenter(renterId: string, filter: BookingListFilter, page: Page): Promise<{ items: Booking[]; total: number }>;
  listForOwner(ownerId: string, filter: BookingListFilter, page: Page): Promise<{ items: Booking[]; total: number }>;
  ownerEarningRows(ownerId: string): Promise<Pick<Booking, "status" | "pickupDate" | "returnDate" | "price" | "refundPercent">[]>;
  // Admin area
  listForAdmin(filter: { status?: BookingStatus }, page: Page): Promise<{ items: Booking[]; total: number }>;
  adminStats(): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    confirmedTotalCents: number;
    confirmedServiceFeeCents: number;
  }>;
}

export type CalendarEntryRecord = {
  id: string;
  kind: "BOOKING" | "OWNER_BLOCK";
  period: Period;
  bookingId: string | null;
  bookingStatus: BookingStatus | null;
  renterId: string | null;
  note: string | null;
};

export interface CalendarRepository {
  /**
   * Serializes calendar writes for one vehicle until the transaction ends. The exclusion
   * constraint alone already guarantees correctness, but concurrent conflicting inserts can
   * deadlock inside Postgres; queuing writers per vehicle turns that into fast, clean conflicts.
   * Must be taken before any booking row lock in the same transaction (consistent lock order).
   */
  lockVehicleCalendar(vehicleId: string): Promise<void>;
  /** @throws ReservationConflictError when the period overlaps an active entry. */
  addBookingEntry(input: { bookingId: string; vehicleId: string; period: Period; createdBy: string }): Promise<void>;
  /** @throws ReservationConflictError when re-activating would overlap. */
  setBookingEntryActive(bookingId: string, active: boolean): Promise<void>;
  /** @throws ReservationConflictError */
  addBlock(input: { id: string; vehicleId: string; period: Period; note: string | null; createdBy: string }): Promise<void>;
  findBlock(id: string): Promise<{ id: string; vehicleId: string; period: Period; note: string | null } | null>;
  deleteBlock(id: string): Promise<void>;
  /** Entries that currently block the vehicle (lapsed, unswept holds excluded). */
  listBlockingEntries(vehicleId: string, range: Period, now: Date): Promise<CalendarEntryRecord[]>;
  vehicleIdsBlockedDuring(period: Period, now: Date): Promise<string[]>;
}

export type VehicleInfo = {
  id: string;
  ownerId: string;
  status: string;
  make: string;
  model: string;
  year: number;
  slug: string;
  city: string;
  imageUrl: string | null;
  dailyRateCents: number;
  currency: Currency;
  timezone: string;
  minDays: number;
  maxDays: number;
};

/** Provided by the vehicles module. */
export interface VehicleCatalog {
  find(id: string): Promise<VehicleInfo | null>;
  findMany(ids: string[]): Promise<Map<string, VehicleInfo>>;
}

/** Provided by the identity module. */
export interface UserDirectory {
  findNames(ids: string[]): Promise<Map<string, string>>;
  findContact(id: string): Promise<{ email: string; name: string } | null>;
}

/** Provided by the payments module; calls happen inside the booking's transaction. */
export interface PaymentCoordinator {
  /** Queues a refund of `percent`% of the captured amount, if anything was captured. */
  refundBooking(bookingId: string, percent: number, reason: string): Promise<void>;
  /** Cancels any still-open payment attempt for the booking. */
  cancelOpenPayment(bookingId: string): Promise<void>;
}

export type BookingDeps = {
  bookings: BookingRepository;
  calendar: CalendarRepository;
  vehicles: VehicleCatalog;
  users: UserDirectory;
  payments: PaymentCoordinator;
  emails: EmailQueue;
  tx: TransactionManager;
  clock: Clock;
  metrics: Metrics;
  config: { holdMinutes: number; webUrl: string };
};
