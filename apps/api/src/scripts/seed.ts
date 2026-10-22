/**
 * Development seed: two demo accounts and a set of listed vehicles. Refuses to run in production.
 *   owner@example.com / password1234   (owner + renter)
 *   renter@example.com / password1234  (renter)
 *   admin@example.com / password1234   (admin)
 * Demo cars get the freely licensed photos in `seed-photos/` (credits: docs/photo-credits.md).
 */
import { readdir, readFile } from "node:fs/promises";
import type { CreateVehicleBody } from "@car-rental/contracts";
import { createVehicle } from "../modules/vehicles/application/owner-vehicle-use-cases.ts";
import { addPhoto } from "../modules/vehicles/application/photo-use-cases.ts";
import { register } from "../modules/identity/application/session-use-cases.ts";
import { becomeOwner } from "../modules/identity/application/account-use-cases.ts";
import { createContainer } from "../container.ts";
import { loadEnv } from "../shared/config/env.ts";

const env = loadEnv();
if (env.NODE_ENV === "production") throw new Error("Refusing to seed a production database");

const logger = { info: console.log, warn: console.warn, error: console.error, debug() {}, trace() {}, fatal: console.error, child: () => logger, level: "info", silent() {} };
const container = createContainer(env, logger as never);
const { identity, vehicles } = container.deps;
const client = { ip: null, userAgent: "seed" };

async function account(email: string, fullName: string) {
  const existing = await identity.users.findByEmailWithPassword(email);
  if (existing) return existing;
  return (await register(identity, { email, fullName, password: "password1234" }, client)).user;
}

const base = { doors: 4, color: null, description: "", features: [], currency: "USD" as const, address: "", minDays: 1, maxDays: 30, status: "ACTIVE" as const };
const fleet: Omit<CreateVehicleBody, keyof typeof base>[] = [
  { make: "Toyota", model: "Corolla Hybrid", year: 2024, category: "sedan", seats: 5, transmission: "automatic", fuelType: "hybrid", dailyRateCents: 4_900, city: "Lisbon", timezone: "Europe/Lisbon" },
  { make: "Tesla", model: "Model Y", year: 2023, category: "suv", seats: 5, transmission: "automatic", fuelType: "electric", dailyRateCents: 8_900, city: "Lisbon", timezone: "Europe/Lisbon" },
  { make: "Ford", model: "Transit Connect", year: 2022, category: "van", seats: 7, transmission: "manual", fuelType: "diesel", dailyRateCents: 6_500, city: "Porto", timezone: "Europe/Lisbon" },
  { make: "Mini", model: "Cooper S", year: 2024, category: "hatchback", seats: 4, transmission: "manual", fuelType: "petrol", dailyRateCents: 5_500, city: "Porto", timezone: "Europe/Lisbon" },
  { make: "BMW", model: "X1 xDrive20d", year: 2023, category: "suv", seats: 5, transmission: "automatic", fuelType: "diesel", dailyRateCents: 7_300, city: "Lisbon", timezone: "Europe/Lisbon" },
  { make: "Mercedes-Benz", model: "E 300 de", year: 2024, category: "luxury", seats: 5, transmission: "automatic", fuelType: "hybrid", dailyRateCents: 12_900, city: "Faro", timezone: "Europe/Lisbon" },
  { make: "Volkswagen", model: "Golf", year: 2022, category: "hatchback", seats: 5, transmission: "manual", fuelType: "petrol", dailyRateCents: 3_900, city: "Faro", timezone: "Europe/Lisbon" },
  { make: "Mazda", model: "MX-5", year: 2023, category: "convertible", seats: 2, transmission: "manual", fuelType: "petrol", dailyRateCents: 6_900, city: "Lisbon", timezone: "Europe/Lisbon" },
  { make: "Skoda", model: "Superb Combi", year: 2023, category: "sedan", seats: 5, transmission: "automatic", fuelType: "diesel", dailyRateCents: 5_200, city: "Porto", timezone: "Europe/Lisbon" },
  { make: "Toyota", model: "Hilux", year: 2022, category: "pickup", seats: 5, transmission: "manual", fuelType: "diesel", dailyRateCents: 7_900, city: "Faro", timezone: "Europe/Lisbon" },
  { make: "Audi", model: "TT Coupé", year: 2021, category: "coupe", seats: 4, transmission: "automatic", fuelType: "petrol", dailyRateCents: 9_500, city: "Lisbon", timezone: "Europe/Lisbon" },
  { make: "Renault", model: "Zoe", year: 2022, category: "hatchback", seats: 5, transmission: "automatic", fuelType: "electric", dailyRateCents: 3_500, city: "Lisbon", timezone: "Europe/Lisbon" },
];

const photoDir = new URL("../../seed-photos/", import.meta.url);
const photoFiles = await readdir(photoDir);

/** "Audi TT Coupé" → "audi-tt-coupe", the prefix of that car's files in seed-photos/. */
const slug = (make: string, model: string) =>
  `${make} ${model}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

try {
  const owner = await becomeOwner(identity, (await account("owner@example.com", "Olivia Owner")).id);
  await account("renter@example.com", "Rui Renter");
  const admin = await account("admin@example.com", "Ada Admin");
  await identity.users.setRoles(admin.id, ["renter", "admin"]);
  const existing = await vehicles.vehicles.listByOwner(owner.id, { page: 1, pageSize: 1 });
  if (existing.total === 0) {
    for (const vehicle of fleet) {
      await createVehicle(vehicles, owner, {
        ...base,
        ...vehicle,
        description: `A well-kept ${vehicle.year} ${vehicle.make} ${vehicle.model}, ready for your next trip.`,
        features: ["Air conditioning", "Bluetooth", "Apple CarPlay", "Cruise control"],
      });
    }
  }
  // Also fills in photos for demo cars seeded before photos existed; cars that have photos are left alone.
  const { items } = await vehicles.vehicles.listByOwner(owner.id, { page: 1, pageSize: 50 });
  let photos = 0;
  for (const vehicle of items.filter((v) => v.imageUrls.length === 0)) {
    const prefix = `${slug(vehicle.make, vehicle.model)}-`;
    for (const file of photoFiles.filter((f) => f.startsWith(prefix) && f.endsWith(".jpg")).sort()) {
      await addPhoto(vehicles, owner, vehicle.id, await readFile(new URL(file, photoDir)));
      photos++;
    }
  }
  console.log(`Seeded: owner@ / renter@ / admin@example.com (password1234), ${fleet.length} vehicles, ${photos} new photos`);
} finally {
  await container.close();
}
