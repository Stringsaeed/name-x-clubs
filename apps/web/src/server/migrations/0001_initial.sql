-- Players, credentials, rounds and rolling leaderboards.
-- One statement per `;` at the end of a line: the migrator runs them one at a time.

CREATE TABLE players (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  -- Generated from the id; both languages are stored so a board can be shown in either.
  nickname_en text NOT NULL,
  nickname_ar text NOT NULL,
  handle_id uuid NULL
);

-- Secrets are stored as SHA-256 hex digests only. Kinds other than `session` arrive in Phase 2.
CREATE TABLE credentials (
  token_hash text PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('session', 'device', 'recovery', 'transfer')),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL
);

CREATE INDEX credentials_player_idx ON credentials (player_id, kind);

-- Optional usernames (Phase 2). `skeleton` is the folded form that must be unique.
CREATE TABLE handles (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  display text NOT NULL,
  skeleton text NOT NULL,
  created_at timestamptz NOT NULL,
  held_until timestamptz NULL
);

CREATE UNIQUE INDEX handles_skeleton_key ON handles (skeleton);

ALTER TABLE players
  ADD CONSTRAINT players_handle_fk FOREIGN KEY (handle_id) REFERENCES handles (id) ON DELETE SET NULL;

-- status: playing -> complete (target reached, awaiting captcha) -> verified | flagged | rejected,
-- or playing -> abandoned. Only `verified` rounds appear on public boards.
CREATE TABLE rounds (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('t10', 't50', 't100')),
  lang text NOT NULL CHECK (lang IN ('en', 'ar')),
  catalog_version text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('playing', 'complete', 'verified', 'flagged', 'rejected', 'abandoned')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NULL,
  found jsonb NOT NULL DEFAULT '[]',
  next_seq int4 NOT NULL DEFAULT 0,
  elapsed_ms int4 NULL,
  -- Every board sorts ascending on score_key. Timed modes use elapsed_ms.
  score_key bigint NULL,
  flags jsonb NOT NULL DEFAULT '[]',
  CHECK (status <> 'verified' OR (finished_at IS NOT NULL AND score_key IS NOT NULL))
);

-- Rolling day and week boards, and "my rank" in them: a range scan over the window's verified
-- rounds. Cost follows the rounds inside the window, not the whole history.
CREATE INDEX rounds_board_window_idx ON rounds (mode, finished_at)
  INCLUDE (player_id, score_key, elapsed_ms)
  WHERE status = 'verified';

-- A player's own best in a window.
CREATE INDEX rounds_player_best_idx ON rounds (player_id, mode, score_key, finished_at)
  WHERE status = 'verified';

-- A player has at most one round in play, so a mode cannot change mid-round.
CREATE UNIQUE INDEX rounds_one_playing_idx ON rounds (player_id) WHERE status = 'playing';

-- One row per submitted entry. received_ms is the server receive time, relative to started_at.
CREATE TABLE round_entries (
  round_id uuid NOT NULL REFERENCES rounds (id) ON DELETE CASCADE,
  seq int4 NOT NULL,
  received_ms int4 NOT NULL,
  client_ms int4 NOT NULL,
  text text NOT NULL,
  accepted jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (round_id, seq)
);

-- All-time board: each player's best verified round, upserted when a round is verified.
CREATE TABLE best_all_time (
  mode text NOT NULL,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES rounds (id) ON DELETE CASCADE,
  score_key bigint NOT NULL,
  elapsed_ms int4 NOT NULL,
  achieved_at timestamptz NOT NULL,
  PRIMARY KEY (mode, player_id)
);

CREATE INDEX best_all_time_board_idx ON best_all_time (mode, score_key, achieved_at)
  INCLUDE (player_id, elapsed_ms);

-- Fixed-window request counters. Old windows are swept with the retention job (Phase 3).
CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int4 NOT NULL,
  PRIMARY KEY (key, window_start)
);
