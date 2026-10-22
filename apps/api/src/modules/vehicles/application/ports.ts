import type { VehicleCategory, VehicleSort, VehicleStatus } from "@car-rental/contracts";
import type { Clock } from "../../../shared/clock.ts";
import type { Vehicle } from "../domain/vehicle.ts";

export type VehicleSearchFilters = {
  q?: string;
  city?: string;
  category?: VehicleCategory;
  transmission?: Vehicle["transmission"];
  fuelType?: Vehicle["fuelType"];
  seatsMin?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
  /** Vehicles already reserved for the requested dates. */
  excludeIds?: string[];
  sort: VehicleSort;
};

export type Page = { page: number; pageSize: number };
export type PageResult<T> = { items: T[]; total: number };

export type NewVehicle = Omit<Vehicle, "version" | "createdAt" | "updatedAt">;
export type VehiclePatch = Partial<Omit<Vehicle, "id" | "ownerId" | "slug" | "version" | "createdAt" | "updatedAt">>;

export interface VehicleRepository {
  create(vehicle: NewVehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findManyByIds(ids: string[]): Promise<Vehicle[]>;
  findActiveBySlug(slug: string): Promise<Vehicle | null>;
  /** Applies the patch only if the stored version still matches; returns null otherwise. */
  updateIfVersion(id: string, expectedVersion: number, patch: VehiclePatch): Promise<Vehicle | null>;
  search(filters: VehicleSearchFilters, page: Page): Promise<PageResult<Vehicle>>;
  listByOwner(ownerId: string, page: Page, status?: VehicleStatus): Promise<PageResult<Vehicle>>;
  // Photos (no version bump: photo changes don't conflict with detail edits)
  /** Appends only while the vehicle has fewer than `max` photos; null otherwise. */
  appendImageIfRoom(id: string, url: string, max: number): Promise<Vehicle | null>;
  removeImage(id: string, url: string): Promise<Vehicle>;
  setImages(id: string, urls: string[]): Promise<Vehicle>;
  // Admin area
  listForAdmin(filter: { q?: string; status?: VehicleStatus }, page: Page): Promise<PageResult<Vehicle>>;
  countSummary(): Promise<{ total: number; listed: number }>;
}

/** Provided by the identity module. */
export interface OwnerDirectory {
  findNames(ids: string[]): Promise<Map<string, string>>;
}

/** Provided by the bookings module (it owns the vehicle calendar). */
export interface ReservationLookup {
  vehicleIdsReservedDuring(period: { start: string; end: string }): Promise<string[]>;
}

/** Object storage for photos (local disk in development, S3-compatible in production). */
export interface PhotoStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  keyFromUrl(url: string): string | null;
}

export type VehicleDeps = {
  photos: PhotoStorage;
  vehicles: VehicleRepository;
  owners: OwnerDirectory;
  reservations: ReservationLookup;
  clock: Clock;
};
