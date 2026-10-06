import { workerEnv, type D1Like } from "./env.server";

export type ScoreRow = {
  game: string;
  puzzleNo: number;
  anonId: string;
  score: number;
  solution: unknown;
};

export type Bucket = { value: number; count: number };

/** One anon id's submission: the score on the histogram and the solution behind it (for replays). */
export type Submission = { score: number; solution: unknown };

/** A spar: a solution scored before the real submission, numbered 1, 2, 3 in order. */
export type Spar = { n: number; score: number; solution: unknown };
export type SparRow = Omit<ScoreRow, "solution"> & { solution: unknown };

export interface ScoreStore {
  readonly kind: "d1" | "memory";
  /** false when this anon id already has a row for this puzzle: one submission a day. */
  insert(row: ScoreRow): Promise<boolean>;
  /** This anon id's stored submission on this puzzle, if it has submitted. */
  find(game: string, puzzleNo: number, anonId: string): Promise<Submission | undefined>;
  histogram(game: string, puzzleNo: number): Promise<Bucket[]>;
  /**
   * Records a spar if this anon id has fewer than `budget` on this puzzle; null once they're spent.
   * One statement, so two tabs sparring at once can't both take the last one.
   */
  addSpar(row: SparRow, budget: number): Promise<Spar | null>;
  /** This anon id's spars on this puzzle, in order. */
  spars(game: string, puzzleNo: number, anonId: string): Promise<Spar[]>;
}

export function d1Store(db: D1Like): ScoreStore {
  return {
    kind: "d1",
    async insert(row) {
      // DO NOTHING + meta.changes tells a duplicate from a fresh row in one round trip, without a
      // read-then-write race between two tabs submitting at once.
      const result = await db
        .prepare(
          `INSERT INTO scores (game, puzzle_no, anon_id, score, solution)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (game, puzzle_no, anon_id) DO NOTHING`,
        )
        .bind(row.game, row.puzzleNo, row.anonId, row.score, JSON.stringify(row.solution))
        .run();
      return result.meta.changes === 1;
    },
    async find(game, puzzleNo, anonId) {
      // The unique key (game, puzzle_no, anon_id) is the index for this lookup.
      const { results } = await db
        .prepare(
          `SELECT score, solution FROM scores WHERE game = ? AND puzzle_no = ? AND anon_id = ?`,
        )
        .bind(game, puzzleNo, anonId)
        .all<{ score: number; solution: string }>();
      const row = results[0];
      return row && { score: row.score, solution: JSON.parse(row.solution) as unknown };
    },
    async histogram(game, puzzleNo) {
      const { results } = await db
        .prepare(
          `SELECT score AS value, COUNT(*) AS count FROM scores
           WHERE game = ? AND puzzle_no = ? GROUP BY score ORDER BY score`,
        )
        .bind(game, puzzleNo)
        .all<Bucket>();
      return results;
    },
    async addSpar(row, budget) {
      // The next number only while fewer than `budget` exist; UNIQUE (game, puzzle_no, anon_id, n)
      // turns a race between two tabs into one insert and one no-op.
      const result = await db
        .prepare(
          `INSERT INTO spars (game, puzzle_no, anon_id, n, score, solution)
           SELECT ?, ?, ?, COUNT(*) + 1, ?, ? FROM spars
           WHERE game = ? AND puzzle_no = ? AND anon_id = ?
           HAVING COUNT(*) < ?
           ON CONFLICT (game, puzzle_no, anon_id, n) DO NOTHING`,
        )
        .bind(
          row.game,
          row.puzzleNo,
          row.anonId,
          row.score,
          JSON.stringify(row.solution),
          row.game,
          row.puzzleNo,
          row.anonId,
          budget,
        )
        .run();
      if (result.meta.changes !== 1) return null;
      const all = await this.spars(row.game, row.puzzleNo, row.anonId);
      return all.at(-1) ?? null;
    },
    async spars(game, puzzleNo, anonId) {
      const { results } = await db
        .prepare(
          `SELECT n, score, solution FROM spars
           WHERE game = ? AND puzzle_no = ? AND anon_id = ? ORDER BY n`,
        )
        .bind(game, puzzleNo, anonId)
        .all<{ n: number; score: number; solution: string }>();
      return results.map((r) => ({
        n: r.n,
        score: r.score,
        solution: JSON.parse(r.solution) as unknown,
      }));
    },
  };
}

// Lives as long as the dev server process (or the preview sandbox), which is all a preview needs.
const sharedRows = new Map<string, ScoreRow>();

const rowKey = (game: string, puzzleNo: number, anonId: string) => `${game}|${puzzleNo}|${anonId}`;

// Spars ride along with whichever score map a store was given, so a test's fresh map gets fresh spars.
const sparMaps = new WeakMap<Map<string, ScoreRow>, Map<string, Spar[]>>();

/** Tests pass their own map so they don't see each other's rows. */
export function memoryStore(rows: Map<string, ScoreRow> = sharedRows): ScoreStore {
  let sparRows = sparMaps.get(rows);
  if (!sparRows) {
    sparRows = new Map();
    sparMaps.set(rows, sparRows);
  }
  const spars = sparRows;
  return {
    kind: "memory",
    async insert(row) {
      const key = rowKey(row.game, row.puzzleNo, row.anonId);
      if (rows.has(key)) return false;
      rows.set(key, row);
      return true;
    },
    async find(game, puzzleNo, anonId) {
      const row = rows.get(rowKey(game, puzzleNo, anonId));
      return row && { score: row.score, solution: row.solution };
    },
    async histogram(game, puzzleNo) {
      const counts = new Map<number, number>();
      for (const row of rows.values()) {
        if (row.game === game && row.puzzleNo === puzzleNo) {
          counts.set(row.score, (counts.get(row.score) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .sort(([a], [b]) => a - b)
        .map(([value, count]) => ({ value, count }));
    },
    async addSpar(row, budget) {
      const key = rowKey(row.game, row.puzzleNo, row.anonId);
      const list = spars.get(key) ?? [];
      if (list.length >= budget) return null;
      const spar = { n: list.length + 1, score: row.score, solution: row.solution };
      spars.set(key, [...list, spar]);
      return spar;
    },
    async spars(game, puzzleNo, anonId) {
      return spars.get(rowKey(game, puzzleNo, anonId)) ?? [];
    },
  };
}

let warnedNoDb = false;

/**
 * D1 when the binding exists, memory otherwise, so pages that read scores keep working in Lovable's
 * preview and under `vite dev`.
 *
 * This used to throw when running on Cloudflare without DB, to stop a broken deploy from quietly
 * keeping scores in one isolate's memory. Lovable's preview turned out to have a Cloudflare-style env
 * with no bindings in it (step 1: its /demo hit that throw), so "on Cloudflare" can't tell preview
 * from production. Instead every response carries `store`, and the deploy check requires "d1".
 */
export async function scoreStore(): Promise<ScoreStore> {
  const env = await workerEnv();
  if (env?.DB) return d1Store(env.DB);
  if (env && !warnedNoDb) {
    warnedNoDb = true;
    console.warn("[minmax] Cloudflare env without a DB binding: scores are kept in memory");
  }
  return memoryStore();
}
