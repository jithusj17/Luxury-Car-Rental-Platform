import { randomUUID } from "node:crypto";
import { CreateBucketCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { beforeAll, describe, expect, it } from "vitest";
import { createS3Storage } from "../src/shared/storage/object-storage.ts";

/**
 * Exercises the production storage driver against a local S3-compatible server (SeaweedFS).
 * Runs when TEST_S3_ENDPOINT is set: `docker compose --profile s3 up -d s3` then
 * TEST_S3_ENDPOINT=http://localhost:8333 pnpm --filter api test
 */
const endpoint = process.env.TEST_S3_ENDPOINT;
const credentials = { accessKeyId: "test", secretAccessKey: "test" };
const bucket = `photos-${randomUUID().slice(0, 8)}`;

describe.skipIf(!endpoint)("S3 storage driver", () => {
  const client = new S3Client({ region: "us-east-1", endpoint, forcePathStyle: true, credentials });
  const storage = createS3Storage({
    bucket,
    region: "us-east-1",
    endpoint,
    forcePathStyle: true,
    ...credentials,
    publicBaseUrl: `${endpoint}/${bucket}`,
  });

  beforeAll(async () => {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  });

  it("stores objects with type and immutable caching, maps URLs to keys, and deletes", async () => {
    const key = `vehicles/test/${randomUUID()}.png`;
    await storage.put(key, Buffer.from("png-bytes"), "image/png");

    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    expect(head.ContentType).toBe("image/png");
    expect(head.CacheControl).toBe("public, max-age=31536000, immutable");
    const body = await (await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body!.transformToString();
    expect(body).toBe("png-bytes");

    expect(storage.keyFromUrl(storage.publicUrl(key))).toBe(key);
    expect(storage.keyFromUrl("https://elsewhere.example/x.png")).toBeNull();

    await storage.delete(key);
    await expect(client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).rejects.toThrow();
  });

  it("refuses keys that try to escape their prefix", async () => {
    await expect(storage.put("../secrets.txt", Buffer.from("x"), "text/plain")).rejects.toThrow(/Invalid storage key/);
  });
});
