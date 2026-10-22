import type {
  CalendarEntry,
  CreateBlockBody,
  EarningsSummary,
  OwnerVehicle,
  Paginated,
  UpdateVehicleStatusBody,
  VehicleBlock,
  VehicleStatus,
} from "@car-rental/contracts";
import type { createVehicleBody, updateVehicleBody } from "@car-rental/contracts";
import type { z } from "zod";
import { parseResponse } from "@/shared/api/api-error";
import { apiRequest, toQuery } from "@/shared/api/client";

export type VehicleInput = z.input<typeof createVehicleBody>;
export type VehiclePatchInput = z.input<typeof updateVehicleBody>;

export const ownerApi = {
  listVehicles: (params: { page: number; pageSize: number; status?: VehicleStatus }) =>
    apiRequest<Paginated<OwnerVehicle>>(`/v1/owner/vehicles${toQuery(params)}`),
  getVehicle: (id: string) => apiRequest<OwnerVehicle>(`/v1/owner/vehicles/${id}`),
  createVehicle: (body: VehicleInput) => apiRequest<OwnerVehicle>("/v1/owner/vehicles", { method: "POST", body }),
  /** Sends the version the form was loaded with; a 409 means someone else changed it meanwhile. */
  updateVehicle: (id: string, body: VehiclePatchInput) => apiRequest<OwnerVehicle>(`/v1/owner/vehicles/${id}`, { method: "PATCH", body }),
  setStatus: (id: string, body: UpdateVehicleStatusBody) =>
    apiRequest<OwnerVehicle>(`/v1/owner/vehicles/${id}/status`, { method: "PUT", body }),
  calendar: (vehicleId: string, from: string, to: string) =>
    apiRequest<{ entries: CalendarEntry[] }>(`/v1/owner/calendar${toQuery({ vehicleId, from, to })}`),
  createBlock: (body: CreateBlockBody) => apiRequest<VehicleBlock>("/v1/owner/blocks", { method: "POST", body }),
  deleteBlock: (id: string) => apiRequest<void>(`/v1/owner/blocks/${id}`, { method: "DELETE" }),
  earnings: () => apiRequest<EarningsSummary>("/v1/owner/earnings"),
  /** Multipart upload; the browser sets the boundary, so no JSON content type here. */
  async uploadPhoto(vehicleId: string, file: File): Promise<OwnerVehicle> {
    const form = new FormData();
    form.append("photo", file);
    const response = await fetch(`/api/v1/owner/vehicles/${vehicleId}/photos`, { method: "POST", body: form, credentials: "same-origin" });
    return parseResponse<OwnerVehicle>(response);
  },
  removePhoto: (vehicleId: string, url: string) =>
    apiRequest<OwnerVehicle>(`/v1/owner/vehicles/${vehicleId}/photos${toQuery({ url })}`, { method: "DELETE" }),
  reorderPhotos: (vehicleId: string, imageUrls: string[]) =>
    apiRequest<OwnerVehicle>(`/v1/owner/vehicles/${vehicleId}/photos/order`, { method: "PUT", body: { imageUrls } }),
};
