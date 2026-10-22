import {
  availabilityQuery,
  availabilityResponse,
  booking,
  bookingListQuery,
  cancelBookingBody,
  createBookingBody,
  idParams,
  paginated,
  quoteQuery,
  quoteResponse,
} from "@car-rental/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { hours, minutes, type RateLimiter } from "../../../shared/http/rate-limit.ts";
import { requireUser } from "../../identity/presentation/auth-guard.ts";
import { cancelBooking } from "../application/booking-lifecycle.ts";
import { getBooking, listRenterBookings } from "../application/booking-queries.ts";
import { getAvailability } from "../application/calendar-use-cases.ts";
import { createBooking, quoteBooking } from "../application/create-booking.ts";
import type { BookingDeps } from "../application/ports.ts";
import { toBookingDto } from "./presenters.ts";

/** Client-generated retry key (e.g. a UUID per checkout attempt). */
const idempotencyHeaders = z.looseObject({
  "idempotency-key": z.string().min(8).max(100).regex(/^[\w:.-]+$/, "Use letters, digits, _ : . or -"),
});
const tags = ["Bookings"];

export function bookingRoutes(app: FastifyInstance, deps: BookingDeps, limit: RateLimiter) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const perUser = (name: string, max: number) =>
    limit(name, { max, windowMs: hours(1), key: (request) => request.auth?.user.id ?? request.ip });

  r.get("/v1/availability", {
    schema: { tags, querystring: availabilityQuery.and(z.object({ vehicleId: z.uuid() })), response: { 200: availabilityResponse } },
    preHandler: [limit("availability", { max: 120, windowMs: minutes(1), failOpen: true })],
  }, async (request) => {
    const { vehicleId, from, to } = request.query;
    const unavailable = await getAvailability(deps, vehicleId, { start: from, end: to });
    return { vehicleId, from, to, unavailable };
  });

  r.get("/v1/bookings/quote", {
    schema: { tags, querystring: quoteQuery.and(z.object({ vehicleId: z.uuid() })), response: { 200: quoteResponse } },
    preHandler: [limit("quote", { max: 120, windowMs: minutes(1), failOpen: true })],
  }, async (request) => {
    const { vehicleId, pickupDate, returnDate } = request.query;
    const quote = await quoteBooking(deps, vehicleId, { pickupDate, returnDate });
    return { vehicleId, pickupDate, returnDate, available: quote.available, price: quote.price };
  });

  r.post("/v1/bookings", {
    schema: { tags, headers: idempotencyHeaders, body: createBookingBody, response: { 200: booking, 201: booking } },
    preHandler: [perUser("booking-create", 30)],
  }, async (request, reply) => {
    const { user } = requireUser(request);
    const result = await createBooking(deps, user, request.body, request.headers["idempotency-key"]);
    const view = await getBooking(deps, user, result.booking.id);
    return reply.status(result.replayed ? 200 : 201).send(toBookingDto(view, user, deps.clock.now()));
  });

  r.get("/v1/bookings", { schema: { tags, querystring: bookingListQuery, response: { 200: paginated(booking) } } }, async (request) => {
    const { user } = requireUser(request);
    const { items, total } = await listRenterBookings(deps, user, request.query);
    const now = deps.clock.now();
    return { items: items.map((v) => toBookingDto(v, user, now)), page: request.query.page, pageSize: request.query.pageSize, total };
  });

  r.get("/v1/bookings/:id", { schema: { tags, params: idParams, response: { 200: booking } } }, async (request) => {
    const { user } = requireUser(request);
    return toBookingDto(await getBooking(deps, user, request.params.id), user, deps.clock.now());
  });

  r.post("/v1/bookings/:id/cancel", {
    schema: { tags, params: idParams, body: cancelBookingBody, response: { 200: booking } },
    preHandler: [perUser("booking-cancel", 30)],
  }, async (request) => {
    const { user } = requireUser(request);
    await cancelBooking(deps, user, request.params.id, request.body.reason);
    return toBookingDto(await getBooking(deps, user, request.params.id), user, deps.clock.now());
  });
}
