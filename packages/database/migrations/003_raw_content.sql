-- Up
CREATE TABLE raw_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  abstract text,
  url text NOT NULL,
  image_url text,
  relevance_score float,
  published_at timestamptz,
  ingested_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  UNIQUE (source, source_id)
);
CREATE INDEX idx_raw_content_status ON raw_content(status);
CREATE INDEX idx_raw_content_published ON raw_content(published_at DESC);

-- Down
DROP INDEX idx_raw_content_published;
DROP INDEX idx_raw_content_status;
DROP TABLE raw_content;
