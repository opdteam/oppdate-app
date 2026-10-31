-- Append-only event log for per-listing performance tracking
CREATE TABLE IF NOT EXISTS opportunity_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid      NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  event_type   varchar(50) NOT NULL,
  user_id      uuid        REFERENCES users(id) ON DELETE SET NULL,
  occurred_at  timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX opportunity_events_opp_idx ON opportunity_events (opportunity_id, occurred_at DESC);
CREATE INDEX opportunity_events_type_idx ON opportunity_events (event_type, occurred_at DESC);
