import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// /demo exists to prove the stack end to end (D1 write, histogram read, analytics event) before any
// game code does. Step 2 ports it onto the kit's puzzle number and anon id.

const DEMO_GAME = "demo";

// UTC day index, so the demo resets daily like a real puzzle.
function demoPuzzleNo(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export const submitDemo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      anonId: z.string().uuid(),
      value: z.number().int().min(0).max(100),
    }),
  )
  .handler(async ({ data }) => {
    // Dynamic import keeps the server-only store out of the client bundle (same idiom as
    // visa-navigator's site-origin.functions.ts).
    const { scoreStore } = await import("./scores.server");
    const store = await scoreStore();
    const puzzleNo = demoPuzzleNo();
    const accepted = await store.insert({
      game: DEMO_GAME,
      puzzleNo,
      anonId: data.anonId,
      score: data.value,
      solution: { value: data.value },
    });
    return { accepted, store: store.kind, buckets: await store.histogram(DEMO_GAME, puzzleNo) };
  });

export const getDemoHistogram = createServerFn({ method: "GET" }).handler(async () => {
  const { scoreStore } = await import("./scores.server");
  const store = await scoreStore();
  return { store: store.kind, buckets: await store.histogram(DEMO_GAME, demoPuzzleNo()) };
});
