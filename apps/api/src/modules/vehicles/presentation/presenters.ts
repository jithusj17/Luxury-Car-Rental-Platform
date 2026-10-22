import type { OwnerVehicle, VehicleDetail, VehicleSummary } from "@car-rental/contracts";
import type { Vehicle } from "../domain/vehicle.ts";

export function toVehicleSummary(vehicle: Vehicle, ownerName: string): VehicleSummary {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    category: vehicle.category,
    seats: vehicle.seats,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuelType,
    dailyRateCents: vehicle.dailyRateCents,
    currency: vehicle.currency,
    city: vehicle.city,
    imageUrl: vehicle.imageUrls[0] ?? null,
    photoCount: vehicle.imageUrls.length,
    owner: { id: vehicle.ownerId, name: ownerName },
  };
}

/** Public detail. The street address is withheld; renters see the city until they book. */
export function toVehicleDetail(vehicle: Vehicle, ownerName: string): VehicleDetail {
  return {
    ...toVehicleSummary(vehicle, ownerName),
    doors: vehicle.doors,
    color: vehicle.color,
    description: vehicle.description,
    features: vehicle.features,
    timezone: vehicle.timezone,
    minDays: vehicle.minDays,
    maxDays: vehicle.maxDays,
    imageUrls: vehicle.imageUrls,
  };
}

export function toOwnerVehicle(vehicle: Vehicle, ownerName: string): OwnerVehicle {
  return {
    ...toVehicleDetail(vehicle, ownerName),
    status: vehicle.status,
    address: vehicle.address,
    version: vehicle.version,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}
