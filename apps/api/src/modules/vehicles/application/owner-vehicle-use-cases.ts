import { randomUUID } from "node:crypto";
import type { CreateVehicleBody, UpdateVehicleBody, UpdateVehicleStatusBody, VehicleStatus } from "@car-rental/contracts";
import { errors } from "../../../shared/errors/app-error.ts";
import { hasRole, isAdmin, type User } from "../../identity/domain/user.ts";
import { canTransition, makeSlug, type Vehicle } from "../domain/vehicle.ts";
import type { Page, PageResult, VehicleDeps, VehiclePatch } from "./ports.ts";

const staleVersion = () => errors.conflict("This vehicle was changed elsewhere. Reload it and try again.");

/** Owners manage their own vehicles; admins may manage any. Others get 404 (no existence leak). */
async function loadManaged(deps: VehicleDeps, user: User, vehicleId: string): Promise<Vehicle> {
  const vehicle = await deps.vehicles.findById(vehicleId);
  if (!vehicle || (vehicle.ownerId !== user.id && !isAdmin(user))) throw errors.notFound("Vehicle");
  return vehicle;
}

export async function createVehicle(deps: VehicleDeps, user: User, body: CreateVehicleBody): Promise<Vehicle> {
  if (!hasRole(user, "owner")) throw errors.forbidden("Become a host to list vehicles");
  const id = randomUUID();
  const { status, ...input } = body;
  return deps.vehicles.create({
    ...input,
    status,
    id,
    ownerId: user.id,
    slug: makeSlug(input.year, input.make, input.model, id),
    imageUrls: [],
  });
}

export async function getOwnedVehicle(deps: VehicleDeps, user: User, vehicleId: string): Promise<Vehicle> {
  return loadManaged(deps, user, vehicleId);
}

export async function listOwnedVehicles(
  deps: VehicleDeps,
  user: User,
  page: Page,
  status?: VehicleStatus,
): Promise<PageResult<Vehicle>> {
  return deps.vehicles.listByOwner(user.id, page, status);
}

export async function updateVehicle(deps: VehicleDeps, user: User, vehicleId: string, body: UpdateVehicleBody): Promise<Vehicle> {
  const vehicle = await loadManaged(deps, user, vehicleId);
  if (vehicle.status === "ARCHIVED") throw errors.conflict("Archived vehicles can't be edited");

  const { version, ...patch } = body;
  const merged = { minDays: vehicle.minDays, maxDays: vehicle.maxDays, ...patch };
  if (merged.minDays > merged.maxDays) {
    throw errors.validation("Minimum days cannot exceed maximum days", [{ path: "body.minDays", message: "Too large" }]);
  }
  const updated = await deps.vehicles.updateIfVersion(vehicleId, version, patch as VehiclePatch);
  if (!updated) throw staleVersion();
  return updated;
}

export async function changeVehicleStatus(
  deps: VehicleDeps,
  user: User,
  vehicleId: string,
  body: UpdateVehicleStatusBody,
): Promise<Vehicle> {
  const vehicle = await loadManaged(deps, user, vehicleId);
  if (!canTransition(vehicle.status, body.status)) {
    throw errors.conflict(`A ${vehicle.status.toLowerCase()} vehicle can't become ${body.status.toLowerCase()}`);
  }
  // Existing bookings stay valid when a vehicle is unlisted; it just stops accepting new ones.
  const updated = await deps.vehicles.updateIfVersion(vehicleId, body.version, { status: body.status });
  if (!updated) throw staleVersion();
  return updated;
}
