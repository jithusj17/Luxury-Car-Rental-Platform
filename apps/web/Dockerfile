# Web image. Build from the repository root:
#   docker build -f apps/web/Dockerfile -t car-rental-web \
#     --build-arg API_INTERNAL_URL=http://api:4000 \
#     --build-arg IMAGE_REMOTE_PATTERNS=https://photos.example.com/vehicles/** \
#     --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... .
# These values are baked in at build time (rewrites, image hosts and NEXT_PUBLIC_* are compiled).

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --filter "web..."

FROM base AS build
ARG API_INTERNAL_URL=http://api:4000
ARG IMAGE_REMOTE_PATTERNS
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_BUILD_CPUS=2
ENV API_INTERNAL_URL=$API_INTERNAL_URL \
    IMAGE_REMOTE_PATTERNS=$IMAGE_REMOTE_PATTERNS \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_BUILD_CPUS=$NEXT_BUILD_CPUS \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
RUN pnpm --filter web build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
