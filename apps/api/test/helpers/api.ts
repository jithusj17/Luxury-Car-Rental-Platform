import { randomUUID } from "node:crypto";
import type { CreateVehicleBody, OwnerVehicle } from "@car-rental/contracts";
import type { FastifyInstance, InjectOptions } from "fastify";
import { ORIGIN } from "./test-app.ts";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type Session = { cookie: string; userId: string; email: string };

/** Thin wrapper over `inject` that sends a trusted Origin and an optional session cookie. */
export function api(app: FastifyInstance) {
  async function call(method: Method, url: string, options: { body?: unknown; session?: Session; headers?: Record<string, string> } = {}) {
    const request: InjectOptions = {
      method,
      url,
      headers: { origin: ORIGIN, ...(options.session && { cookie: options.session.cookie }), ...options.headers },
      ...(options.body !== undefined && { payload: options.body as InjectOptions["payload"] }),
    };
    const response = await app.inject(request);
    return { status: response.statusCode, body: response.body ? safeJson(response.body) : undefined, headers: response.headers, raw: response };
  }
  return {
    call,
    get: (url: string, o?: Parameters<typeof call>[2]) => call("GET", url, o),
    post: (url: string, body?: unknown, o?: Parameters<typeof call>[2]) => call("POST", url, { ...o, body: body ?? {} }),
    patch: (url: string, body: unknown, o?: Parameters<typeof call>[2]) => call("PATCH", url, { ...o, body }),
    put: (url: string, body: unknown, o?: Parameters<typeof call>[2]) => call("PUT", url, { ...o, body }),
    delete: (url: string, o?: Parameters<typeof call>[2]) => call("DELETE", url, o),
  };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function sessionCookie(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie.find((c) => c.startsWith("cr_session=")) : setCookie;
  if (!header) throw new Error("No session cookie set");
  return header.split(";")[0]!;
}

export async function signUp(app: FastifyInstance, options: { name?: string; owner?: boolean; email?: string } = {}): Promise<Session> {
  const email = options.email ?? `user-${randomUUID().slice(0, 8)}@example.com`;
  const response = await api(app).post("/v1/auth/register", { email, password: "correct-horse-battery", fullName: options.name ?? "Test User" });
  if (response.status !== 201) throw new Error(`signUp failed: ${response.status} ${JSON.stringify(response.body)}`);
  const session = { cookie: sessionCookie(response.headers["set-cookie"]), userId: response.body.user.id, email };
  if (options.owner) await api(app).post("/v1/me/become-owner", {}, { session });
  return session;
}

export const vehicleInput = (overrides: Partial<CreateVehicleBody> = {}) => ({
  make: "Toyota",
  model: "Corolla",
  year: 2024,
  category: "sedan",
  seats: 5,
  doors: 4,
  transmission: "automatic",
  fuelType: "hybrid",
  dailyRateCents: 5_000,
  city: "Lisbon",
  address: "Rua Augusta 1",
  timezone: "UTC",
  status: "ACTIVE",
  ...overrides,
});

export async function listVehicle(app: FastifyInstance, owner: Session, overrides: Partial<CreateVehicleBody> = {}): Promise<OwnerVehicle> {
  const response = await api(app).post("/v1/owner/vehicles", vehicleInput(overrides), { session: owner });
  if (response.status !== 201) throw new Error(`listVehicle failed: ${response.status} ${JSON.stringify(response.body)}`);
  return response.body;
}

export function bookingRequest(vehicleId: string, pickupDate: string, returnDate: string) {
  return { vehicleId, pickupDate, returnDate };
}

export const idempotency = (key: string = randomUUID()) => ({ "idempotency-key": key });
