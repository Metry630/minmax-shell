-- Spars (step 5b): solutions a player scores before the real submission, up to the game's budget.
-- n counts 1, 2, 3 per player and puzzle; the unique key is what holds the budget under a race.
CREATE TABLE spars (
  id         INTEGER PRIMARY KEY,
  game       TEXT    NOT NULL,
  puzzle_no  INTEGER NOT NULL,
  anon_id    TEXT    NOT NULL,
  n          INTEGER NOT NULL,
  score      INTEGER NOT NULL, -- scored by the server's engine
  solution   TEXT    NOT NULL, -- JSON
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (game, puzzle_no, anon_id, n)
);
