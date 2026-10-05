import type { GameModule } from "@/kit/game";

import { demo } from "./demo/module";
import { guard } from "./guard/module";

// Every game the API serves, by id. Guard has no puzzles in D1 until step 7 schedules them, so
// production answers `no_puzzle` for it until then; dev and previews generate it on request.
export const games: Readonly<Record<string, GameModule>> = {
  demo,
  guard,
};
