import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, sessionCookie, signUp } from "./helpers/api.ts";
import { createTestApp, drainOutbox, resetDatabase, type TestApp } from "./helpers/test-app.ts";

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  t.emails.length = 0;
});

const credentials = { email: "Ana@Example.com", password: "correct-horse-battery", fullName: "Ana Silva" };

describe("registration and login", () => {
  it("registers with a secure session cookie and normalised email", async () => {
    const res = await api(t.app).post("/v1/auth/register", credentials);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "ana@example.com", fullName: "Ana Silva", roles: ["renter"] });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/cr_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("ignores unknown fields instead of letting clients assign roles", async () => {
    const res = await api(t.app).post("/v1/auth/register", { ...credentials, roles: ["admin", "owner"] });
    expect(res.status).toBe(201);
    expect(res.body.user.roles).toEqual(["renter"]);
  });

  it("rejects duplicate emails case-insensitively", async () => {
    await api(t.app).post("/v1/auth/register", credentials);
    const res = await api(t.app).post("/v1/auth/register", { ...credentials, email: "ANA@example.com" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("validates input with field-level details", async () => {
    const res = await api(t.app).post("/v1/auth/register", { email: "nope", password: "short", fullName: "A" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(["body.email", "body.password", "body.fullName"]),
    );
  });

  it("logs in, exposes the current user, and logs out", async () => {
    await api(t.app).post("/v1/auth/register", credentials);
    const login = await api(t.app).post("/v1/auth/login", { email: "ana@example.com", password: credentials.password });
    expect(login.status).toBe(200);
    const session = { cookie: sessionCookie(login.headers["set-cookie"]), userId: login.body.user.id, email: "" };

    expect((await api(t.app).get("/v1/auth/me", { session })).status).toBe(200);
    expect((await api(t.app).post("/v1/auth/logout", {}, { session })).status).toBe(204);
    expect((await api(t.app).get("/v1/auth/me", { session })).status).toBe(401);
  });

  it("gives the same answer for unknown emails and wrong passwords", async () => {
    await api(t.app).post("/v1/auth/register", credentials);
    const wrongPassword = await api(t.app).post("/v1/auth/login", { email: credentials.email, password: "wrong-password-1" });
    const unknownEmail = await api(t.app).post("/v1/auth/login", { email: "ghost@example.com", password: "wrong-password-1" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe("password reset", () => {
  const resetToken = () => {
    const email = t.emails.find((e) => e.subject === "Reset your password");
    return new URL(/https?:\/\/\S+/.exec(email!.text)![0]).searchParams.get("token")!;
  };

  it("resets with a single-use token and signs out every session", async () => {
    const session = await signUp(t.app, { email: "reset@example.com" });
    expect((await api(t.app).post("/v1/auth/password/forgot", { email: "reset@example.com" })).status).toBe(202);
    await drainOutbox(t.container);
    const token = resetToken();

    const reset = await api(t.app).post("/v1/auth/password/reset", { token, password: "a-brand-new-password" });
    expect(reset.status).toBe(204);
    expect((await api(t.app).get("/v1/auth/me", { session })).status).toBe(401);
    expect((await api(t.app).post("/v1/auth/password/reset", { token, password: "another-new-password" })).status).toBe(400);
    expect((await api(t.app).post("/v1/auth/login", { email: "reset@example.com", password: "a-brand-new-password" })).status).toBe(200);
  });

  it("does not reveal whether an account exists", async () => {
    const res = await api(t.app).post("/v1/auth/password/forgot", { email: "nobody@example.com" });
    expect(res.status).toBe(202);
    await drainOutbox(t.container);
    expect(t.emails).toHaveLength(0);
  });

  it("expires reset links after an hour", async () => {
    await signUp(t.app, { email: "late@example.com" });
    await api(t.app).post("/v1/auth/password/forgot", { email: "late@example.com" });
    await drainOutbox(t.container);
    t.clock.advance(61 * 60_000);
    const res = await api(t.app).post("/v1/auth/password/reset", { token: resetToken(), password: "a-brand-new-password" });
    expect(res.status).toBe(400);
  });
});

describe("account", () => {
  it("changes the password only with the current one, keeping this session", async () => {
    const session = await signUp(t.app);
    const wrong = await api(t.app).post("/v1/me/password", { currentPassword: "nope", newPassword: "another-password-1" }, { session });
    expect(wrong.status).toBe(400);
    const ok = await api(t.app).post("/v1/me/password", { currentPassword: "correct-horse-battery", newPassword: "another-password-1" }, { session });
    expect(ok.status).toBe(204);
    expect((await api(t.app).get("/v1/auth/me", { session })).status).toBe(200);
  });

  it("becomes an owner idempotently", async () => {
    const session = await signUp(t.app);
    await api(t.app).post("/v1/me/become-owner", {}, { session });
    const res = await api(t.app).post("/v1/me/become-owner", {}, { session });
    expect(res.body.user.roles.sort()).toEqual(["owner", "renter"]);
  });
});

describe("request security", () => {
  it("rejects state-changing requests from untrusted or missing origins", async () => {
    const evil = await api(t.app).post("/v1/auth/register", credentials, { headers: { origin: "https://evil.example" } });
    expect(evil.status).toBe(403);
    const none = await t.app.inject({ method: "POST", url: "/v1/auth/logout" });
    expect(none.statusCode).toBe(403);
  });

  it("propagates a caller's request id and uses a consistent error envelope", async () => {
    const res = await api(t.app).get("/v1/nope", { headers: { "x-request-id": "trace-abc-12345" } });
    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toBe("trace-abc-12345");
    expect(res.body.error).toMatchObject({ code: "NOT_FOUND", requestId: "trace-abc-12345" });
  });

  it("rejects malformed JSON without leaking internals", async () => {
    const res = await t.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      payload: "{bad json",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toMatch(/at .*\.ts/);
  });
});
