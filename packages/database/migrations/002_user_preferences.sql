-- Up
CREATE TABLE user_preferences (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  PRIMARY KEY (user_id, topic)
);

-- Down
DROP TABLE user_preferences;
