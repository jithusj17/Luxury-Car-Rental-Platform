import {
  booking,
  bookingListQuery,
  calendarEntry,
  calendarQuery,
  createBlockBody,
  earningsSummary,
  idParams,
  paginated,
  vehicleBlock,
} from "@car-rental/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireRole } from "../../identity/presentation/auth-guard.ts";
import { listOwnerBookings, ownerEarnings } from "../application/booking-queries.ts";
import { createBlock, deleteBlock, getOwnerCalendar } from "../application/calendar-use-cases.ts";
import type { BookingDeps } from "../application/ports.ts";
import { toBookingDto } from "./presenters.ts";

const tags = ["Owner bookings"];

export function ownerBookingRoutes(app: FastifyInstance, deps: BookingDeps) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get("/v1/owner/bookings", { schema: { tags, querystring: bookingListQuery, response: { 200: paginated(booking) } } }, async (request) => {
    const { user } = requireRole(request, "owner");
    const { items, total } = await listOwnerBookings(deps, user, request.query);
    const now = deps.clock.now();
    return { items: items.map((v) => toBookingDto(v, user, now)), page: request.query.page, pageSize: request.query.pageSize, total };
  });

  r.get("/v1/owner/calendar", {
    schema: { tags, querystring: calendarQuery, response: { 200: z.object({ entries: z.array(calendarEntry) }) } },
  }, async (request) => {
    const { user } = requireRole(request, "owner");
    const { vehicleId, from, to } = request.query;
    return { entries: await getOwnerCalendar(deps, user, vehicleId, { start: from, end: to }) };
  });

  r.post("/v1/owner/blocks", { schema: { tags, body: createBlockBody, response: { 201: vehicleBlock } } }, async (request, reply) => {
    const { user } = requireRole(request, "owner");
    return reply.status(201).send(await createBlock(deps, user, request.body));
  });

  r.delete("/v1/owner/blocks/:id", { schema: { tags, params: idParams, response: { 204: z.null() } } }, async (request, reply) => {
    const { user } = requireRole(request, "owner");
    await deleteBlock(deps, user, request.params.id);
    return reply.status(204).send(null);
  });

  r.get("/v1/owner/earnings", { schema: { tags, response: { 200: earningsSummary } } }, async (request) => {
    const { user } = requireRole(request, "owner");
    return ownerEarnings(deps, user);
  });
}
