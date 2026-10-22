import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, listVehicle, signUp, type Session } from "./helpers/api.ts";
import { createTestApp, ORIGIN, resetDatabase, type TestApp } from "./helpers/test-app.ts";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

let t: TestApp;
let storageDir: string;
let owner: Session;
let vehicleId: string;

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(os.tmpdir(), "car-rental-uploads-"));
  t = await createTestApp({ env: { LOCAL_STORAGE_DIR: storageDir } });
});
afterAll(() => t.app.close());
beforeEach(async () => {
  await resetDatabase(t.container);
  owner = await signUp(t.app, { owner: true });
  vehicleId = (await listVehicle(t.app, owner)).id;
});

function upload(session: Session | undefined, id: string, file: Buffer, filename = "car.png", contentType = "image/png") {
  const boundary = "----carrental";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return t.app.inject({
    method: "POST",
    url: `/v1/owner/vehicles/${id}/photos`,
    headers: { origin: ORIGIN, "content-type": `multipart/form-data; boundary=${boundary}`, ...(session && { cookie: session.cookie }) },
    payload: body,
  });
}

describe("vehicle photos", () => {
  it("stores an image under a random name and serves it safely", async () => {
    const res = await upload(owner, vehicleId, PNG, "../../etc/passwd.png");
    expect(res.statusCode).toBe(201);
    const [url] = res.json().imageUrls as string[];
    expect(url).toMatch(new RegExp(`^http://localhost:4000/uploads/vehicles/${vehicleId}/[0-9a-f-]{36}\\.png$`));

    const served = await t.app.inject({ method: "GET", url: new URL(url!).pathname });
    expect(served.statusCode).toBe(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.rawPayload.equals(PNG)).toBe(true);

    const listing = await api(t.app).get("/v1/vehicles");
    expect(listing.body.items[0]).toMatchObject({ imageUrl: url, photoCount: 1 });
  });

  it("rejects files that aren't really images, whatever their name or type says", async () => {
    const res = await upload(owner, vehicleId, Buffer.from("<script>alert(1)</script>"), "evil.png", "image/png");
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/JPEG, PNG or WebP/);
  });

  it("rejects files over 5 MB", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 1)]);
    expect((await upload(owner, vehicleId, big)).statusCode).toBe(413);
  });

  it("allows at most 10 photos", async () => {
    for (let i = 0; i < 10; i += 1) expect((await upload(owner, vehicleId, PNG)).statusCode).toBe(201);
    expect((await upload(owner, vehicleId, PNG)).statusCode).toBe(409);
  });

  it("only lets the vehicle's owner manage photos", async () => {
    const other = await signUp(t.app, { owner: true });
    expect((await upload(other, vehicleId, PNG)).statusCode).toBe(404);
    expect((await upload(undefined, vehicleId, PNG)).statusCode).toBe(401);
  });

  it("removes a photo and deletes its file, and reorders photos", async () => {
    await upload(owner, vehicleId, PNG);
    const second = await upload(owner, vehicleId, PNG);
    const [first, last] = second.json().imageUrls as string[];

    const reordered = await api(t.app).put(`/v1/owner/vehicles/${vehicleId}/photos/order`, { imageUrls: [last, first] }, { session: owner });
    expect(reordered.body.imageUrls).toEqual([last, first]);
    expect((await api(t.app).put(`/v1/owner/vehicles/${vehicleId}/photos/order`, { imageUrls: [last] }, { session: owner })).status).toBe(400);

    const removed = await api(t.app).delete(`/v1/owner/vehicles/${vehicleId}/photos?url=${encodeURIComponent(first!)}`, { session: owner });
    expect(removed.body.imageUrls).toEqual([last]);
    expect(existsSync(path.join(storageDir, new URL(first!).pathname.replace("/uploads/", "")))).toBe(false);
  });
});
