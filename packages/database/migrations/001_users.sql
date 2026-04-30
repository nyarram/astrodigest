CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  push_token text,
  push_notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
