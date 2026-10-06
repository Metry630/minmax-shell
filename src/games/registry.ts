import type { GameModule } from "@/kit/game";

import { demo } from "./demo/module";
import { guardPlans } from "./guard/planModule";

// Every game the API serves, by id. Guard is game-plan Wordle (planModule.ts, LOOP.md v7); the camp
// (guard/module.ts) stays for the lab pages. Production serves what scripts/schedule.ts wrote to
// D1; dev and previews generate the day on request.
export const games: Readonly<Record<string, GameModule>> = {
  demo,
  guard: guardPlans,
};
