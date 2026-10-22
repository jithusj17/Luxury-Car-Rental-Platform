import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api } from "./helpers/api.ts";
import { createTestApp, resetDatabase, type TestApp } from "./helpers/test-app.ts";

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp({ env: { RATE_LIMIT_ENABLED: "true" } });
  await resetDatabase(t.container);
});
afterAll(() => t.app.close());

describe("rate limiting", () => {
  it("limits login attempts per account with 429 and Retry-After", async () => {
    const attempt = () => api(t.app).post("/v1/auth/login", { email: "target@example.com", password: "guess-123456" });
    const statuses: number[] = [];
    for (let i = 0; i < 9; i += 1) statuses.push((await attempt()).status);
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("keeps other accounts usable while one is limited", async () => {
    const res = await api(t.app).post("/v1/auth/login", { email: "someone-else@example.com", password: "guess-123456" });
    expect(res.status).toBe(401);
  });
});
