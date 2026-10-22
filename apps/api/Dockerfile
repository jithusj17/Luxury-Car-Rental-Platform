# API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t car-rental-api .
# The API runs its TypeScript directly on Node 24 (type stripping), so there is no build step.

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
# Production dependencies of the API and the workspace packages it uses (supply-chain policies apply).
RUN pnpm install --frozen-lockfile --prod --filter "api..."

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY packages/contracts ./packages/contracts
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY apps/api/package.json apps/api/
COPY apps/api/migrations ./apps/api/migrations
COPY apps/api/src ./apps/api/src

WORKDIR /app/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
# Migrations run separately (see docker-compose.prod.yml): node src/shared/db/migrate.ts
CMD ["node", "src/main.ts"]
