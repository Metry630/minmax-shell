import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The puzzle and scores API (logic in daily.core.ts). Handlers import the server modules dynamically,
// which keeps D1 code and the store out of the client bundle (same idiom as visa-navigator's
// site-origin.functions.ts).

const puzzleRef = z.object({
  game: z.string().min(1).max(32),
  puzzleNo: z.number().int().min(1).max(100_000),
});
const playerRef = puzzleRef.extend({ anonId: z.string().uuid() });

export const getToday = createServerFn({ method: "GET" })
  // The anon id is optional: with it, a returning player gets today's spars back.
  .inputValidator(puzzleRef.extend({ anonId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const server = await import("./daily.server");
    return server.today(await server.serverDeps(), data);
  });

export const submitSolution = createServerFn({ method: "POST" })
  .inputValidator(
    // The solution's shape is the game's to check (GameModule.solutionSchema).
    // claimedScore is left out by games served redacted (GameModule.publicPuzzle).
    playerRef.extend({ solution: z.unknown(), claimedScore: z.number().int().optional() }),
  )
  .handler(async ({ data }) => {
    const server = await import("./daily.server");
    return server.submit(await server.serverDeps(), data);
  });

export const getResults = createServerFn({ method: "GET" })
  .inputValidator(playerRef)
  .handler(async ({ data }) => {
    const server = await import("./daily.server");
    return server.results(await server.serverDeps(), data);
  });

export const sparSolution = createServerFn({ method: "POST" })
  .inputValidator(playerRef.extend({ solution: z.unknown() }))
  .handler(async ({ data }) => {
    const server = await import("./daily.server");
    return server.spar(await server.serverDeps(), data);
  });
