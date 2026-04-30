-- Add week_start / week_end (timestamptz) and sections (JSON text) to digests.
-- week_start and week_end replace the legacy week_of (date) for new rows;
-- week_of is kept for backwards compat with existing API queries.
-- Columns are nullable so pre-existing rows are unaffected.

ALTER TABLE digests
  ADD COLUMN IF NOT EXISTS week_start timestamptz,
  ADD COLUMN IF NOT EXISTS week_end   timestamptz,
  ADD COLUMN IF NOT EXISTS sections   text;

CREATE INDEX IF NOT EXISTS idx_digests_week_start ON digests (week_start DESC);
