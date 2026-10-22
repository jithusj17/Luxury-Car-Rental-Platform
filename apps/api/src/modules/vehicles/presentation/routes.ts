import {
  createVehicleBody,
  idParams,
  removePhotoQuery,
  reorderPhotosBody,
  ownerVehicle,
  pageQuery,
  paginated,
  slugParams,
  updateVehicleBody,
  updateVehicleStatusBody,
  vehicleDetail,
  vehicleSearchQuery,
  vehicleStatus,
  vehicleSummary,
} from "@car-rental/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { errors } from "../../../shared/errors/app-error.ts";
import { hours, minutes, type RateLimiter } from "../../../shared/http/rate-limit.ts";
import { requireRole } from "../../identity/presentation/auth-guard.ts";
import { getListedVehicle, searchVehicles } from "../application/catalog-use-cases.ts";
import * as owner from "../application/owner-vehicle-use-cases.ts";
import { addPhoto, removePhoto, reorderPhotos } from "../application/photo-use-cases.ts";
import type { VehicleDeps } from "../application/ports.ts";
import { toOwnerVehicle, toVehicleDetail, toVehicleSummary } from "./presenters.ts";

export function vehicleRoutes(app: FastifyInstance, deps: VehicleDeps, limit: RateLimiter) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const searchLimit = limit("search", { max: 120, windowMs: minutes(1), failOpen: true });

  r.get("/v1/vehicles", {
    schema: { tags: ["Vehicles"], querystring: vehicleSearchQuery, response: { 200: paginated(vehicleSummary) } },
    preHandler: [searchLimit],
  }, async (request) => {
    const { items, total } = await searchVehicles(deps, request.query);
    return {
      items: items.map(({ vehicle, ownerName }) => toVehicleSummary(vehicle, ownerName)),
      page: request.query.page,
      pageSize: request.query.pageSize,
      total,
    };
  });

  r.get("/v1/vehicles/:slug", {
    schema: { tags: ["Vehicles"], params: slugParams, response: { 200: vehicleDetail } },
  }, async (request) => {
    const { vehicle, ownerName } = await getListedVehicle(deps, request.params.slug);
    return toVehicleDetail(vehicle, ownerName);
  });

  const ownerTags = ["Owner vehicles"];

  r.get("/v1/owner/vehicles", {
    schema: { tags: ownerTags, querystring: pageQuery.extend({ status: vehicleStatus.optional() }), response: { 200: paginated(ownerVehicle) } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    const { page, pageSize, status } = request.query;
    const { items, total } = await owner.listOwnedVehicles(deps, user, { page, pageSize }, status);
    return { items: items.map((v) => toOwnerVehicle(v, user.fullName)), page, pageSize, total };
  });

  r.post("/v1/owner/vehicles", {
    schema: { tags: ownerTags, body: createVehicleBody, response: { 201: ownerVehicle } },
    preHandler: [limit("vehicle-create", { max: 30, windowMs: hours(1) })],
  }, async (request, reply) => {
    const { user } = requireRole(request, "owner");
    const vehicle = await owner.createVehicle(deps, user, request.body);
    return reply.status(201).send(toOwnerVehicle(vehicle, user.fullName));
  });

  r.get("/v1/owner/vehicles/:id", {
    schema: { tags: ownerTags, params: idParams, response: { 200: ownerVehicle } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    return toOwnerVehicle(await owner.getOwnedVehicle(deps, user, request.params.id), user.fullName);
  });

  r.patch("/v1/owner/vehicles/:id", {
    schema: { tags: ownerTags, params: idParams, body: updateVehicleBody, response: { 200: ownerVehicle } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    return toOwnerVehicle(await owner.updateVehicle(deps, user, request.params.id, request.body), user.fullName);
  });

  // Photos: multipart upload (field "photo"), one file per request; limits enforced while streaming.
  r.post("/v1/owner/vehicles/:id/photos", {
    schema: { tags: ownerTags, params: idParams, consumes: ["multipart/form-data"], response: { 201: ownerVehicle } },
    preHandler: [limit("photo-upload", { max: 60, windowMs: hours(1), key: (request) => request.auth?.user.id ?? request.ip })],
  }, async (request, reply) => {
    const { user } = requireRole(request, "owner");
    const file = await request.file();
    if (!file) throw errors.validation("Attach a photo in the `photo` field");
    const bytes = await file.toBuffer(); // throws 413 past the size limit
    const vehicle = await addPhoto(deps, user, request.params.id, bytes);
    return reply.status(201).send(toOwnerVehicle(vehicle, user.fullName));
  });

  r.delete("/v1/owner/vehicles/:id/photos", {
    schema: { tags: ownerTags, params: idParams, querystring: removePhotoQuery, response: { 200: ownerVehicle } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    return toOwnerVehicle(await removePhoto(deps, user, request.params.id, request.query.url), user.fullName);
  });

  r.put("/v1/owner/vehicles/:id/photos/order", {
    schema: { tags: ownerTags, params: idParams, body: reorderPhotosBody, response: { 200: ownerVehicle } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    return toOwnerVehicle(await reorderPhotos(deps, user, request.params.id, request.body.imageUrls), user.fullName);
  });

  r.put("/v1/owner/vehicles/:id/status", {
    schema: { tags: ownerTags, params: idParams, body: updateVehicleStatusBody, response: { 200: ownerVehicle } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    return toOwnerVehicle(await owner.changeVehicleStatus(deps, user, request.params.id, request.body), user.fullName);
  });
}
