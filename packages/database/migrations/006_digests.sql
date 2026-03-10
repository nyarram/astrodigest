-- Up
CREATE TABLE digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of date UNIQUE NOT NULL,
  big_story_id uuid REFERENCES processed_content(id),
  quick_hit_ids uuid[],
  image_of_week_id uuid REFERENCES processed_content(id),
  paper_dive_id uuid REFERENCES processed_content(id),
  status text DEFAULT 'assembling',
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_digests_week_of ON digests(week_of DESC);

-- Down
DROP INDEX idx_digests_week_of;
DROP TABLE digests;
