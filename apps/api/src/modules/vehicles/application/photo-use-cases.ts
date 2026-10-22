import { randomUUID } from "node:crypto";
import { errors } from "../../../shared/errors/app-error.ts";
import { isAdmin, type User } from "../../identity/domain/user.ts";
import { detectPhotoType, MAX_PHOTO_BYTES, MAX_PHOTOS_PER_VEHICLE } from "../domain/photo.ts";
import type { Vehicle } from "../domain/vehicle.ts";
import type { VehicleDeps } from "./ports.ts";

async function loadEditable(deps: VehicleDeps, user: User, vehicleId: string): Promise<Vehicle> {
  const vehicle = await deps.vehicles.findById(vehicleId);
  if (!vehicle || (vehicle.ownerId !== user.id && !isAdmin(user))) throw errors.notFound("Vehicle");
  if (vehicle.status === "ARCHIVED") throw errors.conflict("Archived vehicles can't be edited");
  return vehicle;
}

/**
 * Stores an uploaded photo under a random key and appends its URL. The file type comes from the
 * bytes, not the name; the photo limit is enforced atomically by the database update.
 */
export async function addPhoto(deps: VehicleDeps, user: User, vehicleId: string, bytes: Buffer): Promise<Vehicle> {
  const vehicle = await loadEditable(deps, user, vehicleId);
  if (bytes.length === 0) throw errors.validation("The file is empty");
  if (bytes.length > MAX_PHOTO_BYTES) throw errors.validation("Photos can be at most 5 MB");
  const type = detectPhotoType(bytes);
  if (!type) throw errors.validation("Upload a JPEG, PNG or WebP image");
  if (vehicle.imageUrls.length >= MAX_PHOTOS_PER_VEHICLE) throw errors.conflict(`A vehicle can have at most ${MAX_PHOTOS_PER_VEHICLE} photos`);

  const key = `vehicles/${vehicle.id}/${randomUUID()}.${type.ext}`;
  await deps.photos.put(key, bytes, type.mime);
  const updated = await deps.vehicles.appendImageIfRoom(vehicle.id, deps.photos.publicUrl(key), MAX_PHOTOS_PER_VEHICLE);
  if (!updated) {
    // A concurrent upload took the last slot: don't leave an orphaned file behind.
    await deps.photos.delete(key);
    throw errors.conflict(`A vehicle can have at most ${MAX_PHOTOS_PER_VEHICLE} photos`);
  }
  return updated;
}

/** Removes the photo from the listing first, then deletes the file (an orphan is harmless; a broken image isn't). */
export async function removePhoto(deps: VehicleDeps, user: User, vehicleId: string, url: string): Promise<Vehicle> {
  const vehicle = await loadEditable(deps, user, vehicleId);
  if (!vehicle.imageUrls.includes(url)) throw errors.notFound("Photo");
  const updated = await deps.vehicles.removeImage(vehicle.id, url);
  const key = deps.photos.keyFromUrl(url);
  if (key) await deps.photos.delete(key);
  return updated;
}

/** New order of the existing photos; the first one is the cover. */
export async function reorderPhotos(deps: VehicleDeps, user: User, vehicleId: string, urls: string[]): Promise<Vehicle> {
  const vehicle = await loadEditable(deps, user, vehicleId);
  const same = urls.length === vehicle.imageUrls.length && new Set(urls).size === urls.length && urls.every((u) => vehicle.imageUrls.includes(u));
  if (!same) throw errors.validation("The new order must contain exactly the vehicle's current photos");
  return deps.vehicles.setImages(vehicle.id, urls);
}
