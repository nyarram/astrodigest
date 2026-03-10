CREATE TABLE prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version integer NOT NULL,
  prompt_template text NOT NULL,
  model text NOT NULL,
  active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (name, version)
);
