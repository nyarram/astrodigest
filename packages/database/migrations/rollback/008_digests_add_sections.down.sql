DROP INDEX IF EXISTS idx_digests_week_start;

ALTER TABLE digests
  DROP COLUMN IF EXISTS sections,
  DROP COLUMN IF EXISTS week_end,
  DROP COLUMN IF EXISTS week_start;
