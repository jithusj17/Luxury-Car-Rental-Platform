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
}

/** Provided by the identity module. */
export interface OwnerDirectory {
  findNames(ids: string[]): Promise<Map<string, string>>;
}

/** Provided by the bookings module (it owns the vehicle calendar). */
export interface ReservationLookup {
  vehicleIdsReservedDuring(period: { start: string; end: string }): Promise<string[]>;
}

export type VehicleDeps = {
  vehicles: VehicleRepository;
  owners: OwnerDirectory;
  reservations: ReservationLookup;
  clock: Clock;
};
