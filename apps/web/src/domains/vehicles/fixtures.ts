import type { VehicleSummary } from "@car-rental/contracts";

/** Typed example vehicle for the style guide and component tests (not used by real pages). */
export const sampleVehicle: VehicleSummary = {
  id: "8d2b7a52-6a0f-4b6e-9b8f-2f5b9a1c0e11",
  slug: "2024-toyota-corolla-8d2b7a52",
  make: "Toyota",
  model: "Corolla",
  year: 2024,
  category: "sedan",
  seats: 5,
  transmission: "automatic",
  fuelType: "hybrid",
  dailyRateCents: 4900,
  currency: "USD",
  city: "Lisbon",
  imageUrl: null,
  photoCount: 0,
  owner: { id: "3f1c2b9e-1d4a-4c7e-8a0b-6e5d4c3b2a19", name: "Kathryn Murphy" },
};
