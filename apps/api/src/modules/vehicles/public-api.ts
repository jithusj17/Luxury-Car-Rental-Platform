import type { VehicleCatalog, VehicleInfo } from "../bookings/application/ports.ts";
import type { VehicleRepository } from "./application/ports.ts";
import type { Vehicle } from "./domain/vehicle.ts";

const toInfo = (v: Vehicle): VehicleInfo => ({
  id: v.id,
  ownerId: v.ownerId,
  status: v.status,
  make: v.make,
  model: v.model,
  year: v.year,
  slug: v.slug,
  city: v.city,
  imageUrl: v.imageUrls[0] ?? null,
  dailyRateCents: v.dailyRateCents,
  currency: v.currency,
  timezone: v.timezone,
  minDays: v.minDays,
  maxDays: v.maxDays,
});

/** What the vehicles module exposes to other modules (read-only). */
export function createVehicleCatalog(vehicles: VehicleRepository): VehicleCatalog {
  return {
    async find(id) {
      const vehicle = await vehicles.findById(id);
      return vehicle ? toInfo(vehicle) : null;
    },
    async findMany(ids) {
      const found = await vehicles.findManyByIds(ids);
      return new Map(found.map((v) => [v.id, toInfo(v)]));
    },
  };
}
