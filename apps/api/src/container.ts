import type { FastifyBaseLogger } from "fastify";
import { Redis } from "ioredis";
import { systemClock, type Clock } from "./shared/clock.ts";
import type { Env } from "./shared/config/env.ts";
import { createDatabase } from "./shared/db/client.ts";
import { createLocalStorage, createS3Storage } from "./shared/storage/object-storage.ts";
import { TransactionManager } from "./shared/db/transaction.ts";
import { Scheduler } from "./shared/jobs/scheduler.ts";
import { createMetrics } from "./shared/observability/metrics.ts";
import { Outbox } from "./shared/outbox/outbox.ts";
import type { AdminDeps } from "./modules/admin/application/ports.ts";
import { createAuditLog } from "./modules/admin/infrastructure/audit-log.ts";
import { confirmPaidBooking, expireLapsedHolds } from "./modules/bookings/application/booking-lifecycle.ts";
import type { BookingDeps, PaymentCoordinator } from "./modules/bookings/application/ports.ts";
import { createBookingRepository } from "./modules/bookings/infrastructure/booking-repository.ts";
import { createCalendarRepository } from "./modules/bookings/infrastructure/calendar-repository.ts";
import type { IdentityDeps, PasswordHasher } from "./modules/identity/application/ports.ts";
import { createScryptHasher } from "./modules/identity/infrastructure/scrypt-password-hasher.ts";
import { createPasswordResetRepository, createSessionRepository } from "./modules/identity/infrastructure/session-repository.ts";
import { createUserRepository } from "./modules/identity/infrastructure/user-repository.ts";
import {
  createLogEmailSender,
  createOutboxEmailQueue,
  createSmtpEmailSender,
  registerEmailDelivery,
  type EmailSender,
} from "./modules/notifications/infrastructure/email-delivery.ts";
import { createPaymentCoordinator, reconcileStalePayments } from "./modules/payments/application/payment-maintenance.ts";
import type { PaymentDeps } from "./modules/payments/application/ports.ts";
import { registerPaymentJobs } from "./modules/payments/infrastructure/jobs.ts";
import { createMockPaymentProvider } from "./modules/payments/infrastructure/mock-provider/mock-payment-provider.ts";
import { createPaymentRepository, createWebhookInbox } from "./modules/payments/infrastructure/payment-repository.ts";
import type { VehicleDeps } from "./modules/vehicles/application/ports.ts";
import { createVehicleRepository } from "./modules/vehicles/infrastructure/vehicle-repository.ts";
import { createVehicleCatalog } from "./modules/vehicles/public-api.ts";

export type ContainerOverrides = { clock?: Clock; hasher?: PasswordHasher; emailSender?: EmailSender };
export type Container = ReturnType<typeof createContainer>;

/** Composition root: the only place that knows every concrete implementation. */
export function createContainer(env: Env, logger: FastifyBaseLogger, overrides: ContainerOverrides = {}) {
  const clock = overrides.clock ?? systemClock;
  const database = createDatabase(env);
  const tx = new TransactionManager(database.db);
  const metrics = createMetrics();
  const outbox = new Outbox(tx, clock);
  const redis = env.REDIS_URL
    ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2_000, lazyConnect: false })
    : undefined;
  redis?.on("error", (error) => logger.warn({ err: error }, "Redis error"));

  const emailSender =
    overrides.emailSender ??
    (env.EMAIL_TRANSPORT === "smtp" && env.SMTP_URL
      ? createSmtpEmailSender(env.SMTP_URL, env.EMAIL_FROM)
      : createLogEmailSender(logger, env.NODE_ENV !== "production"));
  registerEmailDelivery(outbox, emailSender);
  const emails = createOutboxEmailQueue(outbox);
  const webUrl = env.WEB_ORIGINS[0] ?? "http://localhost:3000";

  // Identity
  const users = createUserRepository(tx);
  const sessions = createSessionRepository(tx);
  const identity: IdentityDeps = {
    users,
    sessions,
    resets: createPasswordResetRepository(tx),
    hasher: overrides.hasher ?? createScryptHasher(),
    emails,
    tx,
    clock,
    config: { sessionTtlDays: env.SESSION_TTL_DAYS, webUrl },
  };

  // Vehicles
  const storagePublicUrl = env.STORAGE_PUBLIC_URL ?? `${env.PUBLIC_API_URL}/uploads`;
  const localStorage = env.STORAGE_DRIVER === "local" ? createLocalStorage(env.LOCAL_STORAGE_DIR, storagePublicUrl) : undefined;
  const photoStorage =
    localStorage ??
    createS3Storage({
      bucket: env.S3_BUCKET!,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      publicBaseUrl: storagePublicUrl,
    });
  const vehicleRepository = createVehicleRepository(tx);
  const calendar = createCalendarRepository(tx);
  const vehicles: VehicleDeps = {
    photos: photoStorage,
    vehicles: vehicleRepository,
    owners: users,
    reservations: { vehicleIdsReservedDuring: (period) => calendar.vehicleIdsBlockedDuring(period, clock.now()) },
    clock,
  };

  // Bookings ⇄ payments call each other through ports; the coordinator is bound once both exist.
  let paymentCoordinator: PaymentCoordinator | undefined;
  const paymentPort: PaymentCoordinator = {
    refundBooking: (...args) => paymentCoordinator!.refundBooking(...args),
    cancelOpenPayment: (...args) => paymentCoordinator!.cancelOpenPayment(...args),
  };
  const bookingRepository = createBookingRepository(tx);
  const bookings: BookingDeps = {
    bookings: bookingRepository,
    calendar,
    vehicles: createVehicleCatalog(vehicleRepository),
    users: {
      findNames: (ids) => users.findNames(ids),
      findContact: async (id) => {
        const user = await users.findById(id);
        return user ? { email: user.email, name: user.fullName } : null;
      },
    },
    payments: paymentPort,
    emails,
    tx,
    clock,
    metrics,
    config: { holdMinutes: env.BOOKING_HOLD_MINUTES, webUrl },
  };

  const paymentRepository = createPaymentRepository(tx);
  const payments: PaymentDeps = {
    payments: paymentRepository,
    inbox: createWebhookInbox(tx),
    provider: createMockPaymentProvider(tx, clock, env.PAYMENT_WEBHOOK_SECRET),
    bookings: {
      getForPayment: async (id) => {
        const b = await bookingRepository.findById(id);
        return b && { id: b.id, renterId: b.renterId, status: b.status, totalCents: b.price.totalCents, currency: b.price.currency, holdExpiresAt: b.holdExpiresAt };
      },
      confirmPaid: (id) => confirmPaidBooking(bookings, id),
    },
    outbox,
    tx,
    clock,
    metrics,
  };
  paymentCoordinator = createPaymentCoordinator(payments);

  const admin: AdminDeps = {
    users,
    sessions,
    payments: paymentRepository,
    vehicles,
    bookings,
    audit: createAuditLog(tx),
    tx,
    clock,
  };
  registerPaymentJobs(outbox, payments);

  outbox.onPermanentFailure((job, error) => {
    metrics.outboxFailures.inc({ type: job.type });
    logger.error({ err: error, jobId: job.id, type: job.type }, "Outbox job failed permanently");
  });

  const scheduler = new Scheduler(logger)
    .every("outbox", 1_000, () => outbox.drain())
    .every("expire-holds", 30_000, () => expireLapsedHolds(bookings))
    .every("reconcile-payments", 120_000, () => reconcileStalePayments(payments))
    .every("purge-sessions", 3_600_000, () => sessions.deleteExpired(clock.now()));

  return {
    env,
    clock,
    database,
    tx,
    redis,
    metrics,
    outbox,
    scheduler,
    emailSender,
    /** Set when photos are stored on local disk (served by the API under /uploads). */
    localStorage,
    deps: { identity, vehicles, bookings, payments, admin },
    async close() {
      await scheduler.stop();
      redis?.disconnect();
      await database.close();
    },
  };
}
