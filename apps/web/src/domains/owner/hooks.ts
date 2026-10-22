"use client";

import type { CreateBlockBody, OwnerVehicle, UpdateVehicleStatusBody, VehicleStatus } from "@car-rental/contracts";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerApi, type VehicleInput, type VehiclePatchInput } from "./api";

export const ownerKeys = {
  vehicles: ["owner", "vehicles"] as const,
  vehicleList: (params: object) => ["owner", "vehicles", "list", params] as const,
  vehicle: (id: string) => ["owner", "vehicles", id] as const,
  calendar: (vehicleId: string, from: string, to: string) => ["owner", "calendar", vehicleId, from, to] as const,
  earnings: ["owner", "earnings"] as const,
};

export function useOwnerVehicles(params: { page: number; pageSize: number; status?: VehicleStatus }) {
  return useQuery({ queryKey: ownerKeys.vehicleList(params), queryFn: () => ownerApi.listVehicles(params), placeholderData: keepPreviousData });
}

export function useOwnerVehicle(id: string) {
  return useQuery({ queryKey: ownerKeys.vehicle(id), queryFn: () => ownerApi.getVehicle(id) });
}

export function useSaveVehicle(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleInput | VehiclePatchInput) =>
      id ? ownerApi.updateVehicle(id, body as VehiclePatchInput) : ownerApi.createVehicle(body as VehicleInput),
    onSuccess: (vehicle) => {
      queryClient.setQueryData(ownerKeys.vehicle(vehicle.id), vehicle);
      void queryClient.invalidateQueries({ queryKey: ownerKeys.vehicles });
    },
  });
}

export function useSetVehicleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateVehicleStatusBody & { id: string }) => ownerApi.setStatus(id, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ownerKeys.vehicles }),
  });
}

export function useOwnerCalendar(vehicleId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ownerKeys.calendar(vehicleId ?? "", from, to),
    queryFn: () => ownerApi.calendar(vehicleId!, from, to),
    enabled: Boolean(vehicleId),
    placeholderData: keepPreviousData,
  });
}

export function useCalendarMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["owner", "calendar"] });
  return {
    createBlock: useMutation({ mutationFn: (body: CreateBlockBody) => ownerApi.createBlock(body), onSuccess: refresh }),
    deleteBlock: useMutation({ mutationFn: (id: string) => ownerApi.deleteBlock(id), onSuccess: refresh }),
  };
}

/** Photo changes update the cached vehicle in place (they don't change its edit version). */
export function usePhotoMutations(vehicleId: string) {
  const queryClient = useQueryClient();
  const onSuccess = (vehicle: OwnerVehicle) => {
    queryClient.setQueryData(ownerKeys.vehicle(vehicle.id), vehicle);
    void queryClient.invalidateQueries({ queryKey: ownerKeys.vehicles, refetchType: "none" });
  };
  return {
    upload: useMutation({ mutationFn: (file: File) => ownerApi.uploadPhoto(vehicleId, file), onSuccess }),
    remove: useMutation({ mutationFn: (url: string) => ownerApi.removePhoto(vehicleId, url), onSuccess }),
    reorder: useMutation({ mutationFn: (urls: string[]) => ownerApi.reorderPhotos(vehicleId, urls), onSuccess }),
  };
}

export function useEarnings() {
  return useQuery({ queryKey: ownerKeys.earnings, queryFn: ownerApi.earnings });
}
