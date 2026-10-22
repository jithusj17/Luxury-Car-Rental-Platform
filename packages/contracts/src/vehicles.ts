import { z } from "zod";
import { cents, currency, isoDate, pageQuery } from "./common.ts";

export const vehicleCategory = z.enum(["sedan", "suv", "hatchback", "coupe", "convertible", "van", "pickup", "luxury"]);
export const transmission = z.enum(["automatic", "manual"]);
export const fuelType = z.enum(["petrol", "diesel", "hybrid", "electric"]);
export const vehicleStatus = z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]);
export type VehicleCategory = z.infer<typeof vehicleCategory>;
export type VehicleStatus = z.infer<typeof vehicleStatus>;

const ianaTimezone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Unknown timezone");

const vehicleFields = z.object({
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1990).max(new Date().getUTCFullYear() + 1),
  category: vehicleCategory,
  seats: z.number().int().min(1).max(15),
  doors: z.number().int().min(2).max(6),
  transmission,
  fuelType,
  color: z.string().trim().max(30).nullable().default(null),
  description: z.string().trim().max(4000).default(""),
  features: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  dailyRateCents: z.number().int().min(500).max(1_000_000),
  currency: currency.default("USD"),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200).default(""),
  timezone: ianaTimezone,
  minDays: z.number().int().min(1).max(30).default(1),
  maxDays: z.number().int().min(1).max(90).default(30),
});

const minNotAboveMax = (v: { minDays?: number; maxDays?: number }) =>
  v.minDays === undefined || v.maxDays === undefined || v.minDays <= v.maxDays;

export const createVehicleBody = vehicleFields
  .extend({ status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT") })
  .refine(minNotAboveMax, {
  message: "Minimum days cannot exceed maximum days",
  path: ["minDays"],
});
export type CreateVehicleBody = z.infer<typeof createVehicleBody>;

/** Partial update guarded by optimistic concurrency (`version`). */
export const updateVehicleBody = vehicleFields
  .partial()
  .extend({ version: z.number().int().min(1) })
  .refine(minNotAboveMax, { message: "Minimum days cannot exceed maximum days", path: ["minDays"] });
export type UpdateVehicleBody = z.infer<typeof updateVehicleBody>;

export const updateVehicleStatusBody = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  version: z.number().int().min(1),
});
export type UpdateVehicleStatusBody = z.infer<typeof updateVehicleStatusBody>;

export const vehicleSummary = z.object({
  id: z.uuid(),
  slug: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  category: vehicleCategory,
  seats: z.number().int(),
  transmission,
  fuelType,
  dailyRateCents: cents,
  currency,
  city: z.string(),
  /** Primary photo; null until vehicle images are added. */
  imageUrl: z.string().nullable(),
  photoCount: z.number().int(),
  owner: z.object({ id: z.uuid(), name: z.string() }),
});
export type VehicleSummary = z.infer<typeof vehicleSummary>;

export const vehicleDetail = vehicleSummary.extend({
  doors: z.number().int(),
  color: z.string().nullable(),
  description: z.string(),
  features: z.array(z.string()),
  timezone: z.string(),
  minDays: z.number().int(),
  maxDays: z.number().int(),
  imageUrls: z.array(z.string()),
});
export type VehicleDetail = z.infer<typeof vehicleDetail>;

export const ownerVehicle = vehicleDetail.extend({
  status: vehicleStatus,
  address: z.string(),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type OwnerVehicle = z.infer<typeof ownerVehicle>;

export const vehicleSort = z.enum(["recommended", "price_asc", "price_desc", "newest"]);
export type VehicleSort = z.infer<typeof vehicleSort>;

export const vehicleSearchQuery = pageQuery
  .extend({
    q: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    category: vehicleCategory.optional(),
    transmission: transmission.optional(),
    fuelType: fuelType.optional(),
    seatsMin: z.coerce.number().int().min(1).max(15).optional(),
    priceMinCents: z.coerce.number().int().min(0).optional(),
    priceMaxCents: z.coerce.number().int().min(0).optional(),
    pickupDate: isoDate.optional(),
    returnDate: isoDate.optional(),
    sort: vehicleSort.default("recommended"),
  })
  .refine((q) => (q.pickupDate === undefined) === (q.returnDate === undefined), {
    message: "Provide both pickup and return dates",
    path: ["returnDate"],
  })
  .refine((q) => !q.pickupDate || !q.returnDate || q.pickupDate < q.returnDate, {
    message: "Return date must be after pickup date",
    path: ["returnDate"],
  });
export type VehicleSearchQuery = z.infer<typeof vehicleSearchQuery>;

export const availabilityQuery = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.from < q.to, { message: "`to` must be after `from`", path: ["to"] });

export const availabilityResponse = z.object({
  vehicleId: z.uuid(),
  from: isoDate,
  to: isoDate,
  /** Half-open `[start, end)` ranges that cannot be booked. */
  unavailable: z.array(z.object({ start: isoDate, end: isoDate })),
});
export type AvailabilityResponse = z.infer<typeof availabilityResponse>;

export const removePhotoQuery = z.object({ url: z.url().max(500) });
export const reorderPhotosBody = z.object({ imageUrls: z.array(z.url().max(500)).max(10) });
export type ReorderPhotosBody = z.infer<typeof reorderPhotosBody>;

export const slugParams = z.object({ slug: z.string().min(1).max(160) });
