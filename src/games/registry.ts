import type { GameModule } from "@/kit/game";

import { demo } from "./demo/module";

// Every game the API serves, by id. Guard joins in step 5.
export const games: Readonly<Record<string, GameModule>> = { demo };
