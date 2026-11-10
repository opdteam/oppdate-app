-- Stores the result of a user's eligibility check for a listing.
-- score is the sum of option scores from all answers.
-- tier is derived: 'eligible' (>=0), 'borderline' (<0 and >-50), 'ineligible' (<=-50).
CREATE TABLE eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]',
  score integer NOT NULL DEFAULT 0,
  tier text NOT NULL CHECK (tier IN ('eligible', 'borderline', 'ineligible')),
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX eligibility_checks_user_idx ON eligibility_checks(user_id);
CREATE INDEX eligibility_checks_listing_idx ON eligibility_checks(listing_id);
CREATE UNIQUE INDEX eligibility_checks_user_listing_idx ON eligibility_checks(user_id, listing_id);
