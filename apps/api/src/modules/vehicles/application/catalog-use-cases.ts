import type { VehicleSearchQuery } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import { isBookable, type Vehicle } from "../domain/vehicle.ts";
import type { PageResult, VehicleDeps } from "./ports.ts";

export type VehicleWithOwner = { vehicle: Vehicle; ownerName: string };

async function withOwnerNames(deps: VehicleDeps, vehicles: Vehicle[]): Promise<VehicleWithOwner[]> {
  const names = await deps.owners.findNames(vehicles.map((v) => v.ownerId));
  return vehicles.map((vehicle) => ({ vehicle, ownerName: names.get(vehicle.ownerId) ?? "Host" }));
}

/**
 * Public catalog search. With dates, vehicles already reserved for that period are excluded —
 * a convenience for browsing only; booking creation re-checks availability under a constraint.
 */
export async function searchVehicles(deps: VehicleDeps, query: VehicleSearchQuery): Promise<PageResult<VehicleWithOwner>> {
  const excludeIds =
    query.pickupDate && query.returnDate
      ? await deps.reservations.vehicleIdsReservedDuring({ start: query.pickupDate, end: query.returnDate })
      : [];

  const result = await deps.vehicles.search(
    {
      q: query.q,
      city: query.city,
      category: query.category,
      transmission: query.transmission,
      fuelType: query.fuelType,
      seatsMin: query.seatsMin,
      priceMinCents: query.priceMinCents,
      priceMaxCents: query.priceMaxCents,
      excludeIds,
      sort: query.sort,
    },
    { page: query.page, pageSize: query.pageSize },
  );
  return { items: await withOwnerNames(deps, result.items), total: result.total };
}

export async function getListedVehicle(deps: VehicleDeps, slug: string): Promise<VehicleWithOwner> {
  const vehicle = await deps.vehicles.findActiveBySlug(slug);
  if (!vehicle) throw errors.notFound("Vehicle");
  const [item] = await withOwnerNames(deps, [vehicle]);
  return item!;
}

/** Used by the bookings module: the vehicle as it is now, or null if it can't be booked. */
export async function getBookableVehicle(deps: VehicleDeps, vehicleId: string): Promise<Vehicle | null> {
  const vehicle = await deps.vehicles.findById(vehicleId);
  return vehicle && isBookable(vehicle) ? vehicle : null;
}
