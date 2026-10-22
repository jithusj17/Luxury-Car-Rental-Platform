CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"roles" text[] DEFAULT '{renter}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"category" text NOT NULL,
	"seats" integer NOT NULL,
	"doors" integer NOT NULL,
	"transmission" text NOT NULL,
	"fuel_type" text NOT NULL,
	"color" text,
	"description" text DEFAULT '' NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"daily_rate_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"city" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"timezone" text NOT NULL,
	"min_days" integer DEFAULT 1 NOT NULL,
	"max_days" integer DEFAULT 30 NOT NULL,
	"status" text NOT NULL,
	"image_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "vehicles_status_check" CHECK ("vehicles"."status" in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
	CONSTRAINT "vehicles_rate_check" CHECK ("vehicles"."daily_rate_cents" > 0),
	CONSTRAINT "vehicles_days_check" CHECK ("vehicles"."min_days" >= 1 and "vehicles"."min_days" <= "vehicles"."max_days")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"renter_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"pickup_date" date NOT NULL,
	"return_date" date NOT NULL,
	"timezone" text NOT NULL,
	"days" integer NOT NULL,
	"status" text NOT NULL,
	"daily_rate_cents" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"service_fee_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancellation_reason" text,
	"refund_percent" integer,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_renter_idempotency_key" UNIQUE("renter_id","idempotency_key"),
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
	CONSTRAINT "bookings_period_check" CHECK ("bookings"."pickup_date" < "bookings"."return_date"),
	CONSTRAINT "bookings_amounts_check" CHECK ("bookings"."total_cents" = "bookings"."subtotal_cents" + "bookings"."service_fee_cents")
);
--> statement-breakpoint
CREATE TABLE "vehicle_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"period" daterange NOT NULL,
	"kind" text NOT NULL,
	"booking_id" uuid,
	"note" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_reservations_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "vehicle_reservations_kind_check" CHECK ("vehicle_reservations"."kind" in ('BOOKING', 'OWNER_BLOCK')),
	CONSTRAINT "vehicle_reservations_booking_link_check" CHECK (("vehicle_reservations"."kind" = 'BOOKING') = ("vehicle_reservations"."booking_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhook_events_provider_event" UNIQUE("provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"renter_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"currency" char(3) NOT NULL,
	"status" text NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text,
	"client_secret" text,
	"failure_reason" text,
	"succeeded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_payment_id_unique" UNIQUE("provider_payment_id"),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
	CONSTRAINT "payments_refund_check" CHECK ("payments"."refunded_cents" between 0 and "payments"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text NOT NULL,
	"provider_refund_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "refunds_provider_refund_id_unique" UNIQUE("provider_refund_id"),
	CONSTRAINT "refunds_status_check" CHECK ("refunds"."status" in ('PENDING', 'SUCCEEDED', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "mock_provider_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"status" text NOT NULL,
	"client_secret" text NOT NULL,
	"reference" text NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_provider_payments_client_secret_unique" UNIQUE("client_secret"),
	CONSTRAINT "mock_provider_payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "mock_provider_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mock_provider_refunds_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "outbox_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "outbox_jobs_status_check" CHECK ("outbox_jobs"."status" in ('PENDING', 'RUNNING', 'DONE', 'FAILED'))
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_renter_id_users_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_reservations" ADD CONSTRAINT "vehicle_reservations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_reservations" ADD CONSTRAINT "vehicle_reservations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_renter_id_users_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_provider_refunds" ADD CONSTRAINT "mock_provider_refunds_payment_id_mock_provider_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."mock_provider_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "vehicles_owner_idx" ON "vehicles" USING btree ("owner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "vehicles_active_city_idx" ON "vehicles" USING btree ("city") WHERE "vehicles"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "vehicles_active_price_idx" ON "vehicles" USING btree ("daily_rate_cents","id") WHERE "vehicles"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "vehicles_active_newest_idx" ON "vehicles" USING btree ("created_at" DESC NULLS LAST,"id") WHERE "vehicles"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "bookings_renter_idx" ON "bookings" USING btree ("renter_id","pickup_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bookings_owner_idx" ON "bookings" USING btree ("owner_id","pickup_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bookings_vehicle_idx" ON "bookings" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "bookings_pending_hold_idx" ON "bookings" USING btree ("hold_expires_at") WHERE "bookings"."status" = 'PENDING_PAYMENT';--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_active_per_booking" ON "payments" USING btree ("booking_id") WHERE "payments"."status" in ('REQUIRES_ACTION', 'SUCCEEDED');--> statement-breakpoint
CREATE INDEX "payments_open_idx" ON "payments" USING btree ("created_at") WHERE "payments"."status" = 'REQUIRES_ACTION';--> statement-breakpoint
CREATE INDEX "outbox_jobs_due_idx" ON "outbox_jobs" USING btree ("run_at") WHERE "outbox_jobs"."status" = 'PENDING';