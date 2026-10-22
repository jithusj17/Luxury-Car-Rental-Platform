import type { Currency, VehicleCategory, VehicleStatus } from "@car-rental/contracts";

export type Vehicle = {
  id: string;
  ownerId: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  seats: number;
  doors: number;
  transmission: "automatic" | "manual";
  fuelType: "petrol" | "diesel" | "hybrid" | "electric";
  color: string | null;
  description: string;
  features: string[];
  dailyRateCents: number;
  currency: Currency;
  city: string;
  address: string;
  timezone: string;
  minDays: number;
  maxDays: number;
  status: VehicleStatus;
  imageUrls: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Only listed (ACTIVE) vehicles can be found by renters or booked. */
export function isBookable(vehicle: Pick<Vehicle, "status">): boolean {
  return vehicle.status === "ACTIVE";
}

const allowedTransitions: Record<VehicleStatus, VehicleStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["INACTIVE", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: VehicleStatus, to: VehicleStatus): boolean {
  return from === to || allowedTransitions[from].includes(to);
}

/** URL slug, e.g. `2024-toyota-corolla-1a2b3c4d`; the id suffix keeps it unique and stable. */
export function makeSlug(year: number, make: string, model: string, id: string): string {
  const words = `${year} ${make} ${model}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${words}-${id.slice(0, 8)}`;
}
