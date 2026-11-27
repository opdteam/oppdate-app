-- Dynamic consultation slots: unique partial index prevents double-booking
-- Only active bookings (pending/confirmed) are constrained; cancelled bookings are ignored
CREATE UNIQUE INDEX IF NOT EXISTS "consultations_session_scheduled_active_idx"
  ON "consultations" ("session_id", "scheduled_at")
  WHERE status IN ('pending', 'confirmed');
