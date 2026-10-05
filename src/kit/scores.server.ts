import { workerEnv, type D1Like } from "./env.server";

export type ScoreRow = {
  game: string;
  puzzleNo: number;
  anonId: string;
  score: number;
  solution: unknown;
};

export type Bucket = { value: number; count: number };

export interface ScoreStore {
  readonly kind: "d1" | "memory";
  /** false when this anon id already has a row for this puzzle: one submission a day. */
  insert(row: ScoreRow): Promise<boolean>;
  /** The stored score of this anon id on this puzzle, if it has submitted. */
  find(game: string, puzzleNo: number, anonId: string): Promise<number | undefined>;
  histogram(game: string, puzzleNo: number): Promise<Bucket[]>;
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
        .prepare(`SELECT score FROM scores WHERE game = ? AND puzzle_no = ? AND anon_id = ?`)
        .bind(game, puzzleNo, anonId)
        .all<{ score: number }>();
      return results[0]?.score;
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
  };
}

// Lives as long as the dev server process (or the preview sandbox), which is all a preview needs.
const sharedRows = new Map<string, ScoreRow>();

const rowKey = (game: string, puzzleNo: number, anonId: string) => `${game}|${puzzleNo}|${anonId}`;

/** Tests pass their own map so they don't see each other's rows. */
export function memoryStore(rows: Map<string, ScoreRow> = sharedRows): ScoreStore {
  return {
    kind: "memory",
    async insert(row) {
      const key = rowKey(row.game, row.puzzleNo, row.anonId);
      if (rows.has(key)) return false;
      rows.set(key, row);
      return true;
    },
    async find(game, puzzleNo, anonId) {
      return rows.get(rowKey(game, puzzleNo, anonId))?.score;
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
