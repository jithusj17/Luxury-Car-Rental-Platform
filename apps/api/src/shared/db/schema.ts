// Aggregates every module's tables for drizzle-kit migrations. Application code imports
// tables from the owning module, never from here.
export * from "../../modules/identity/infrastructure/schema.ts";
export * from "../../modules/vehicles/infrastructure/schema.ts";
export * from "../../modules/bookings/infrastructure/schema.ts";
export * from "../../modules/payments/infrastructure/schema.ts";
export * from "../../modules/payments/infrastructure/mock-provider/schema.ts";
export * from "../outbox/schema.ts";
