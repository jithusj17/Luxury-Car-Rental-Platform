import type { OwnerVehicle } from "@car-rental/contracts";
import { fuelType, transmission, vehicleCategory } from "@car-rental/contracts";
import { z } from "zod";
import type { VehicleInput } from "./api";

export const FEATURE_OPTIONS = [
  "Air conditioning",
  "Bluetooth",
  "Apple CarPlay",
  "Android Auto",
  "GPS navigation",
  "Cruise control",
  "Parking sensors",
  "Rear camera",
  "Heated seats",
  "Child seat available",
  "Roof rack",
  "Sunroof",
];

export const TIMEZONES = ["Europe/Lisbon", "Europe/London", "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "UTC"];

const requiredNumber = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `Enter ${label}` }).int(`Use a whole number`).min(min, `Minimum ${min}`).max(max, `Maximum ${max}`);

/** Form shape (human units, e.g. price in dollars); converted to the API contract on submit. */
export const vehicleFormSchema = z
  .object({
    make: z.string().trim().min(1, "Required").max(40),
    model: z.string().trim().min(1, "Required").max(60),
    year: requiredNumber(1990, new Date().getFullYear() + 1, "a year"),
    category: vehicleCategory,
    seats: requiredNumber(1, 15, "seats"),
    doors: requiredNumber(2, 6, "doors"),
    transmission,
    fuelType,
    color: z.string().trim().max(30),
    description: z.string().trim().max(4000),
    features: z.array(z.string()).max(40),
    dailyRate: z.coerce.number({ error: "Enter a price" }).min(5, "Minimum $5").max(10_000, "Maximum $10,000"),
    minDays: requiredNumber(1, 30, "days"),
    maxDays: requiredNumber(1, 90, "days"),
    city: z.string().trim().min(1, "Required").max(80),
    address: z.string().trim().max(200),
    timezone: z.string().min(1),
  })
  .refine((v) => v.minDays <= v.maxDays, { message: "Can't exceed the maximum", path: ["minDays"] });

export type VehicleFormValues = z.input<typeof vehicleFormSchema>;
export type VehicleFormOutput = z.output<typeof vehicleFormSchema>;

export function toVehicleInput({ dailyRate, color, ...values }: VehicleFormOutput): Omit<VehicleInput, "status"> {
  return { ...values, color: color || null, dailyRateCents: Math.round(dailyRate * 100), currency: "USD" };
}

export function toFormValues(vehicle?: OwnerVehicle): VehicleFormValues {
  const browserZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return vehicle
    ? {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        category: vehicle.category,
        seats: vehicle.seats,
        doors: vehicle.doors,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        color: vehicle.color ?? "",
        description: vehicle.description,
        features: vehicle.features,
        dailyRate: vehicle.dailyRateCents / 100,
        minDays: vehicle.minDays,
        maxDays: vehicle.maxDays,
        city: vehicle.city,
        address: vehicle.address,
        timezone: vehicle.timezone,
      }
    : {
        make: "",
        model: "",
        year: new Date().getFullYear(),
        category: "sedan",
        seats: 5,
        doors: 4,
        transmission: "automatic",
        fuelType: "petrol",
        color: "",
        description: "",
        features: [],
        dailyRate: "" as unknown as number,
        minDays: 1,
        maxDays: 30,
        city: "",
        address: "",
        timezone: TIMEZONES.includes(browserZone) ? browserZone : "UTC",
      };
}

/** API field names → form field names, for mapping server validation errors. */
export const SERVER_FIELD_MAP: Record<string, string> = { dailyRateCents: "dailyRate" };
