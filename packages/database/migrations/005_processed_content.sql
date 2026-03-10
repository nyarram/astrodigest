-- Up
CREATE TABLE processed_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_content_id uuid REFERENCES raw_content(id) ON DELETE CASCADE,
  summary_short text,
  summary_long text,
  prompt_version_id uuid REFERENCES prompt_versions(id),
  model_used text,
  input_tokens integer,
  output_tokens integer,
  confidence_score float,
  flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_processed_content_flagged ON processed_content(flagged);

-- Down
DROP INDEX idx_processed_content_flagged;
DROP TABLE processed_content;
