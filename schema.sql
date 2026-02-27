-- Run this once in the Vercel Postgres query console
-- to initialize the database schema.

CREATE TABLE IF NOT EXISTS entries (
  id          TEXT  PRIMARY KEY,
  user_id     TEXT  NOT NULL,
  type        TEXT  NOT NULL CHECK (type IN ('sprint', 'block')),
  time_sec    REAL  NOT NULL CHECK (time_sec > 0),
  date        TEXT  NOT NULL,
  location    TEXT  NOT NULL DEFAULT '',
  notes       TEXT  NOT NULL DEFAULT '',
  created_at  TEXT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_user_id    ON entries (user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at DESC);

-- Auth: username/password accounts
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
