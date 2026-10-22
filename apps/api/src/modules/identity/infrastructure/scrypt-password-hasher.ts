import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { PasswordHasher } from "../application/ports.ts";

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))),
  );

/**
 * OWASP-equivalent scrypt parameters N=2^14, r=8, p=5: the same work factor as N=2^17/p=1 but
 * ≈16 MiB per hash instead of 128 MiB, so concurrent logins can't exhaust server memory.
 */
const DEFAULTS = { N: 2 ** 14, r: 8, p: 5, keylen: 64 };

/**
 * scrypt via Node's built-in crypto (no native add-ons). Hashes are self-describing
 * (`scrypt$N$r$p$salt$hash`) so parameters can be raised later without breaking old hashes.
 */
export function createScryptHasher(params: Partial<typeof DEFAULTS> = {}): PasswordHasher {
  const { N, r, p, keylen } = { ...DEFAULTS, ...params };
  const maxmem = 256 * N * r;

  return {
    async hash(password) {
      const salt = randomBytes(16);
      const key = await scrypt(password, salt, keylen, { N, r, p, maxmem });
      return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
    },

    async verify(password, stored) {
      const [scheme, n, rr, pp, salt, hash] = stored.split("$");
      if (scheme !== "scrypt" || !n || !rr || !pp || !salt || !hash) return false;
      const expected = Buffer.from(hash, "base64");
      const options = { N: Number(n), r: Number(rr), p: Number(pp), maxmem: 256 * Number(n) * Number(rr) };
      const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, options);
      return timingSafeEqual(actual, expected);
    },
  };
}
