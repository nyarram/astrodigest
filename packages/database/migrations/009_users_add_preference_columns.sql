ALTER TABLE users
  ADD COLUMN preferred_sources  text[]  NOT NULL DEFAULT ARRAY['nasa', 'eso', 'arxiv'],
  ADD COLUMN delivery_day       text    NOT NULL DEFAULT 'monday',
  ADD COLUMN delivery_time      text    NOT NULL DEFAULT '09:00',
  ADD COLUMN timezone           text    NOT NULL DEFAULT 'UTC',
  ADD COLUMN min_relevance_score real   NOT NULL DEFAULT 0.70;
