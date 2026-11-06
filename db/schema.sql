BEGIN;
SELECT pg_advisory_xact_lock(71834029);

CREATE TABLE IF NOT EXISTS wall_state (
  id integer PRIMARY KEY CHECK (id = 1),
  round integer NOT NULL DEFAULT 1 CHECK (round > 0),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
INSERT INTO wall_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS dreams (
  id uuid PRIMARY KEY,
  dream text NOT NULL CHECK (char_length(dream) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  hidden boolean NOT NULL DEFAULT false
);

COMMIT;
