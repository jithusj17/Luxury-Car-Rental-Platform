import type { VehicleCategory, VehicleSummary } from "@car-rental/contracts";

export const categoryLabels: Record<VehicleCategory, string> = {
  sedan: "Sedan",
  suv: "SUV",
  hatchback: "Hatchback",
  coupe: "Coupe",
  convertible: "Convertible",
  van: "Van",
  pickup: "Pickup",
  luxury: "Luxury",
};

export const transmissionLabels = { automatic: "Automatic", manual: "Manual" } as const;
export const fuelLabels = { petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", electric: "Electric" } as const;

export const vehicleTitle = (v: Pick<VehicleSummary, "year" | "make" | "model">) => `${v.year} ${v.make} ${v.model}`;

export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
