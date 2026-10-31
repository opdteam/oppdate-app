ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS applications_assigned_to_idx ON applications(assigned_to);
