ALTER TABLE users
  DROP COLUMN IF EXISTS preferred_sources,
  DROP COLUMN IF EXISTS delivery_day,
  DROP COLUMN IF EXISTS delivery_time,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS min_relevance_score;
