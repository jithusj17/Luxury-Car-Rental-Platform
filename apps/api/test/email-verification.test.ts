import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { grantConfiguredAdmins } from "../src/modules/admin/application/configured-admins.ts";
import { api, signUp } from "./helpers/api.ts";
import { createTestApp, drainOutbox, resetDatabase, type TestApp } from "./helpers/test-app.ts";

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp({ env: { ADMIN_EMAILS: " Boss@Example.com , second@example.com" } });
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  t.emails.length = 0;
});

/** Token from the newest email sent to `to` that contains a verification link. */
async function verificationToken(to: string): Promise<string> {
  await drainOutbox(t.container);
  const email = t.emails.filter((e) => e.to === to && e.text.includes("/verify-email?token=")).at(-1);
  return new URL(/https?:\/\/\S+/.exec(email!.text)![0]).searchParams.get("token")!;
}

const me = async (session: Awaited<ReturnType<typeof signUp>>) => (await api(t.app).get("/v1/auth/me", { session })).body.user;

describe("email verification", () => {
  it("emails a link on sign-up that verifies the account once", async () => {
    const session = await signUp(t.app, { email: "new@example.com" });
    expect((await me(session)).emailVerified).toBe(false);

    const token = await verificationToken("new@example.com");
    const res = await api(t.app).post("/v1/auth/email/verify", { token });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "new@example.com", emailVerified: true });
    expect((await me(session)).emailVerified).toBe(true);
    expect((await api(t.app).post("/v1/auth/email/verify", { token })).status).toBe(400);
  });

  it("resends a fresh link and retires the old one", async () => {
    const session = await signUp(t.app, { email: "again@example.com" });
    const first = await verificationToken("again@example.com");
    expect((await api(t.app).post("/v1/me/email/verification", {}, { session })).status).toBe(202);
    const second = await verificationToken("again@example.com");

    expect(second).not.toBe(first);
    expect((await api(t.app).post("/v1/auth/email/verify", { token: first })).status).toBe(400);
    expect((await api(t.app).post("/v1/auth/email/verify", { token: second })).status).toBe(200);
    expect((await api(t.app).post("/v1/me/email/verification", {}, { session })).status).toBe(409);
  });

  it("expires links after 24 hours", async () => {
    await signUp(t.app, { email: "slow@example.com" });
    const token = await verificationToken("slow@example.com");
    t.clock.advance(25 * 60 * 60_000);
    expect((await api(t.app).post("/v1/auth/email/verify", { token })).status).toBe(400);
  });

  it("requires a signed-in user to resend", async () => {
    expect((await api(t.app).post("/v1/me/email/verification", {})).status).toBe(401);
  });
});

describe("ADMIN_EMAILS", () => {
  it("grants admin when a listed account verifies, and records it in the audit log", async () => {
    const session = await signUp(t.app, { email: "boss@example.com" });
    expect((await me(session)).roles).toEqual(["renter"]);
    expect((await api(t.app).get("/v1/admin/overview", { session })).status).toBe(403);

    const res = await api(t.app).post("/v1/auth/email/verify", { token: await verificationToken("boss@example.com") });
    expect(res.body.user.roles).toEqual(["renter", "admin"]);
    expect((await api(t.app).get("/v1/admin/overview", { session })).status).toBe(200);

    const audit = (await api(t.app).get("/v1/admin/audit-log", { session })).body.items;
    expect(audit).toEqual([
      expect.objectContaining({ action: "user.roles_changed", targetId: session.userId, details: { from: ["renter"], to: ["renter", "admin"], source: "ADMIN_EMAILS" } }),
    ]);
  });

  it("never grants admin to an unverified account, even at startup", async () => {
    const session = await signUp(t.app, { email: "second@example.com" });
    expect(await grantConfiguredAdmins(t.container.deps.admin, t.container.env.ADMIN_EMAILS)).toEqual([]);
    expect((await me(session)).roles).toEqual(["renter"]);
  });

  it("at startup, promotes listed accounts that are already verified", async () => {
    const session = await signUp(t.app, { email: "second@example.com" });
    await t.container.deps.identity.users.markEmailVerified(session.userId, new Date());
    expect(await grantConfiguredAdmins(t.container.deps.admin, t.container.env.ADMIN_EMAILS)).toEqual(["second@example.com"]);
    expect((await me(session)).roles).toEqual(["renter", "admin"]);
    // Running again changes nothing.
    expect(await grantConfiguredAdmins(t.container.deps.admin, t.container.env.ADMIN_EMAILS)).toEqual([]);
  });

  it("leaves accounts that aren't listed alone", async () => {
    const session = await signUp(t.app, { email: "someone@example.com" });
    const res = await api(t.app).post("/v1/auth/email/verify", { token: await verificationToken("someone@example.com") });
    expect(res.body.user.roles).toEqual(["renter"]);
    expect((await me(session)).roles).toEqual(["renter"]);
  });
});
