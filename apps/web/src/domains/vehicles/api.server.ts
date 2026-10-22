import "server-only";
import type { Paginated, VehicleDetail, VehicleSummary } from "@car-rental/contracts";
import { isApiError } from "@/shared/api/api-error";
import { toQuery } from "@/shared/api/client";
import { serverApi } from "@/shared/api/server";

export type CatalogParams = Record<string, string | undefined>;

/** Whitelisted search parameters, so arbitrary query strings aren't forwarded to the API. */
const SEARCH_KEYS = ["q", "city", "category", "transmission", "fuelType", "seatsMin", "priceMaxCents", "pickupDate", "returnDate", "sort", "page", "pageSize"];

export function searchVehicles(params: CatalogParams) {
  const query = Object.fromEntries(SEARCH_KEYS.map((key) => [key, params[key]]));
  return serverApi<Paginated<VehicleSummary>>(`/v1/vehicles${toQuery(query)}`);
}

export async function getVehicle(slug: string): Promise<VehicleDetail | null> {
  try {
    return await serverApi<VehicleDetail>(`/v1/vehicles/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (isApiError(error, 404) || isApiError(error, 400)) return null;
    throw error;
  }
}
