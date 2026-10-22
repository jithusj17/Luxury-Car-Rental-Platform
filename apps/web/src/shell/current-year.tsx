import { cacheLife } from "next/cache";

/** Copyright year. Cached so `new Date()` doesn't block prerendering under Cache Components. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
