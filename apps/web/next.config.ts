import path from "node:path";
import type { NextConfig } from "next";

/** Docker builds set NEXT_OUTPUT=standalone: a self-contained server with only the files it needs. */
const standalone = process.env.NEXT_OUTPUT === "standalone";

/** Where the Next.js server reaches the API (never exposed to the browser). */
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * Hosts allowed for vehicle photos (comma-separated URL patterns), e.g. your S3/R2 public bucket:
 * https://photos.example.com/vehicles/**
 */
const imagePatterns = (process.env.IMAGE_REMOTE_PATTERNS ?? "http://localhost:4000/uploads/**")
  .split(",")
  .map((pattern) => pattern.trim())
  .filter(Boolean)
  .map((pattern) => new URL(pattern));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  ...(standalone && {
    output: "standalone" as const,
    // Monorepo: trace dependencies from the repository root (shared contracts package).
    outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  }),
  // Cap build workers on memory-constrained machines/CI (default: one per CPU core).
  experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) || undefined },
  // Shared request/response schemas are consumed as TypeScript source.
  transpilePackages: ["@car-rental/contracts"],
  images: {
    remotePatterns: imagePatterns,
    // Only for local development, where photos are served from localhost. Never enable in production.
    dangerouslyAllowLocalIP: process.env.IMAGES_ALLOW_LOCAL_IP === "true",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  /**
   * The browser talks to the API through this same-origin path, so the session cookie is
   * first-party (SameSite=Lax) and no CORS is involved.
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
