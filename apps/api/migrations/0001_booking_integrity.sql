-- Booking integrity: the database, not application code, guarantees that a vehicle can never
-- have two overlapping active calendar entries (booking holds, confirmed bookings, owner blocks).
-- Periods are half-open daterange values [pickup, return), so back-to-back rentals do not overlap.
-- Concurrent inserts serialize on the GiST index: the second conflicting transaction waits for the
-- first and then fails with SQLSTATE 23P01, which the API maps to 409 BOOKING_CONFLICT.
ALTER TABLE "vehicle_reservations"
  ADD CONSTRAINT "vehicle_reservations_no_overlap"
  EXCLUDE USING gist ("vehicle_id" WITH =, "period" WITH &&)
  WHERE ("active");
--> statement-breakpoint
ALTER TABLE "vehicle_reservations"
  ADD CONSTRAINT "vehicle_reservations_period_check"
  CHECK (NOT isempty("period") AND lower_inc("period") AND NOT upper_inc("period"));
--> statement-breakpoint
-- Free-text vehicle search (make/model) on active listings.
CREATE INDEX "vehicles_active_search_trgm_idx"
  ON "vehicles" USING gin (("make" || ' ' || "model") gin_trgm_ops)
  WHERE "status" = 'ACTIVE';
