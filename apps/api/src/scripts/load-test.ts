/**
 * Lightweight load test for the two hot paths: catalog search and booking creation under contention.
 * Run against a disposable stack with rate limiting disabled:
 *   BASE_URL=http://localhost:4100 node src/scripts/load-test.ts
 */
import { randomUUID } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:4100";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";

type Result = { ms: number; status: number };

async function call(path: string, init: RequestInit & { cookie?: string } = {}): Promise<Result & { body: any; headers: Headers }> {
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { origin: ORIGIN, "content-type": "application/json", ...(init.cookie && { cookie: init.cookie }), ...(init.headers as object) },
  });
  const text = await res.text();
  return { ms: performance.now() - started, status: res.status, body: text ? JSON.parse(text) : undefined, headers: res.headers };
}

async function pool<T>(count: number, concurrency: number, task: (i: number) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < count) {
        const i = next++;
        results[i] = await task(i);
      }
    }),
  );
  return results;
}

function report(name: string, results: Result[], wallMs: number) {
  const sorted = results.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!.toFixed(1);
  const byStatus = results.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log(`${name}: ${results.length} req in ${(wallMs / 1000).toFixed(1)}s → ${(results.length / (wallMs / 1000)).toFixed(0)} req/s | p50 ${pct(50)}ms p95 ${pct(95)}ms p99 ${pct(99)}ms | ${JSON.stringify(byStatus)}`);
}

async function signUp(owner = false) {
  const res = await call("/v1/auth/register", { method: "POST", body: JSON.stringify({ email: `load-${randomUUID()}@example.com`, password: "correct-horse-battery", fullName: "Load Tester" }) });
  const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
  if (owner) await call("/v1/me/become-owner", { method: "POST", body: "{}", cookie });
  return cookie;
}

const owner = await signUp(true);
const vehicleIds: string[] = [];
for (let i = 0; i < 40; i += 1) {
  const res = await call("/v1/owner/vehicles", {
    method: "POST",
    cookie: owner,
    body: JSON.stringify({ make: "Load", model: `Car ${i}`, year: 2024, category: i % 2 ? "suv" : "sedan", seats: 5, doors: 4, transmission: "automatic", fuelType: "petrol", dailyRateCents: 3000 + i * 100, city: i % 3 ? "Lisbon" : "Porto", timezone: "UTC", status: "ACTIVE" }),
  });
  vehicleIds.push(res.body.id);
}

const pickup = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const ret = new Date(Date.now() + 33 * 86_400_000).toISOString().slice(0, 10);

// 1. Search: mixed filters, with and without dates (dates add the availability anti-join).
let t0 = performance.now();
const queries = ["", "?city=lisbon", "?category=suv&sort=price_asc", "?q=car", `?pickupDate=${pickup}&returnDate=${ret}`];
const search = await pool(2000, 50, (i) => call(`/v1/vehicles${queries[i % queries.length]}`));
report("search", search, performance.now() - t0);

// 2. Contention: 100 renters race for the same vehicle and dates. Exactly one may win.
const renters = await pool(100, 20, () => signUp());
t0 = performance.now();
const contended = await pool(100, 100, (i) =>
  call("/v1/bookings", { method: "POST", cookie: renters[i], headers: { "idempotency-key": randomUUID() }, body: JSON.stringify({ vehicleId: vehicleIds[0], pickupDate: pickup, returnDate: ret }) }),
);
report("booking (same slot)", contended, performance.now() - t0);
const winners = contended.filter((r) => r.status === 201).length;
console.log(`  → ${winners} succeeded, ${contended.filter((r) => r.status === 409).length} rejected with 409`);
if (winners !== 1) {
  console.error("INVARIANT VIOLATED: expected exactly one successful booking");
  process.exit(1);
}

// 3. Throughput without contention: each renter books a different vehicle.
t0 = performance.now();
const spread = await pool(39, 39, (i) =>
  call("/v1/bookings", { method: "POST", cookie: renters[i + 1], headers: { "idempotency-key": randomUUID() }, body: JSON.stringify({ vehicleId: vehicleIds[i + 1], pickupDate: pickup, returnDate: ret }) }),
);
report("booking (distinct vehicles)", spread, performance.now() - t0);
