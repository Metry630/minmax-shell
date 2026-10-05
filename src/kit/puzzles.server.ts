import { workerEnv, type D1Like } from "./env.server";
import type { GameModule, Json, Optimum, QualityReport } from "./game";
import { resolveSalt, rngFor } from "./seed";

// Where a day's puzzle comes from. Production reads D1's `puzzles` table, which scripts/schedule.ts
// fills offline with the real salt (step 7). Without a DB binding (vite dev, Lovable preview) the
// puzzle is generated, solved and quality-checked on request instead. Either way no puzzle is served
// unless the solver produced its optimum and the quality report passed (CLAUDE.md, principle 1).

export type LoadedPuzzle = { puzzle: Json; optimum: Optimum<Json> };

export interface PuzzleSource {
  readonly kind: "d1" | "generated";
  load(module: GameModule, puzzleNo: number): Promise<LoadedPuzzle | undefined>;
}

/** Generate → solve → check. Undefined when the quality report fails. step 7's scheduler reuses it. */
export async function generateChecked(
  module: GameModule,
  salt: string,
  puzzleNo: number,
): Promise<(LoadedPuzzle & { quality: QualityReport }) | undefined> {
  const puzzle = module.generator.generate(await rngFor(salt, module.id, puzzleNo));
  const optimum = module.solver.solve(puzzle);
  const quality = module.quality.report([{ puzzle, optimum }]);
  return quality.pass ? { puzzle, optimum, quality } : undefined;
}

// Per isolate (or dev server): a puzzle is a pure function of salt, game and number.
const generatedCache = new Map<string, Promise<LoadedPuzzle | undefined>>();

function generated(module: GameModule, salt: string, puzzleNo: number) {
  const key = `${module.id}|${puzzleNo}`;
  let entry = generatedCache.get(key);
  if (!entry) {
    entry = generateChecked(module, salt, puzzleNo).then(
      (checked) => checked && { puzzle: checked.puzzle, optimum: checked.optimum },
    );
    generatedCache.set(key, entry);
  }
  return entry;
}

export function generatedPuzzles(salt: string): PuzzleSource {
  return { kind: "generated", load: (module, puzzleNo) => generated(module, salt, puzzleNo) };
}

export function d1Puzzles(db: D1Like, salt: string): PuzzleSource {
  return {
    kind: "d1",
    async load(module, puzzleNo) {
      const { results } = await db
        .prepare(`SELECT puzzle, optimum FROM puzzles WHERE game = ? AND puzzle_no = ?`)
        .bind(module.id, puzzleNo)
        .all<{ puzzle: string; optimum: string }>();
      const row = results[0];
      if (row) {
        return {
          puzzle: JSON.parse(row.puzzle) as Json,
          optimum: JSON.parse(row.optimum) as Optimum<Json>,
        };
      }
      // A real game's solver doesn't fit the Worker's 10 ms of CPU, so an unscheduled day is no
      // puzzle; only a module marked onDemand (the demo) is generated here.
      return module.onDemand ? generated(module, salt, puzzleNo) : undefined;
    },
  };
}

export async function puzzleSource(): Promise<PuzzleSource> {
  const env = await workerEnv();
  const salt = resolveSalt(env?.PUZZLE_SALT);
  return env?.DB ? d1Puzzles(env.DB, salt) : generatedPuzzles(salt);
}
