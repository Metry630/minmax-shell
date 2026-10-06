import { games } from "@/games/registry";

import type { Deps } from "./daily.core";
import { puzzleSource } from "./puzzles.server";
import { scoreStore } from "./scores.server";

export { results, spar, submit, today } from "./daily.core";

/** The real stores for this request: D1 on the Worker, memory and generated puzzles elsewhere. */
export async function serverDeps(): Promise<Deps> {
  const [puzzles, scores] = await Promise.all([puzzleSource(), scoreStore()]);
  return { games, puzzles, scores, now: new Date() };
}
