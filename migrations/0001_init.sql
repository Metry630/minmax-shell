-- Puzzles are written by scripts/schedule.ts with the real PUZZLE_SALT (step 7), never committed.
-- The client gets `puzzle` before submitting and `optimum` only after.
CREATE TABLE puzzles (
  game      TEXT    NOT NULL,
  puzzle_no INTEGER NOT NULL,
  puzzle    TEXT    NOT NULL, -- JSON
  optimum   TEXT    NOT NULL, -- JSON, solver-verified
  quality   TEXT    NOT NULL, -- JSON, the quality report that let it ship
  PRIMARY KEY (game, puzzle_no)
);

-- One row per player per puzzle; the unique key is what makes "one submission a day" hold on the
-- server, and its (game, puzzle_no) prefix serves the histogram query.
CREATE TABLE scores (
  id         INTEGER PRIMARY KEY,
  game       TEXT    NOT NULL,
  puzzle_no  INTEGER NOT NULL,
  anon_id    TEXT    NOT NULL,
  score      INTEGER NOT NULL, -- re-scored by the server, never taken from the client
  solution   TEXT    NOT NULL, -- JSON
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (game, puzzle_no, anon_id)
);
