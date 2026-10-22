import type { NextConfig } from "next";

/** Where the Next.js server reaches the API (never exposed to the browser). */
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

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
  // Cap build workers on memory-constrained machines/CI (default: one per CPU core).
  experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) || undefined },
  // Shared request/response schemas are consumed as TypeScript source.
  transpilePackages: ["@car-rental/contracts"],
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
