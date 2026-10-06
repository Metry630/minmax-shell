import { act, renderHook, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { results, submit, today, type Deps } from "@/kit/daily.core";
import { generatedPuzzles } from "@/kit/puzzles.server";
import { memoryStore } from "@/kit/scores.server";

import { guard } from "./module";
import { useGuardPuzzle } from "./ui-contract";

// The whole contract, load to results to reload, against the real API logic (daily.core) on a memory
// store: only the network hop of the TanStack server functions is replaced.

const deps: Deps = {
  games: { guard },
  puzzles: generatedPuzzles("contract-test"),
  scores: memoryStore(new Map()),
  now: new Date(),
};
const served: unknown[] = [];

vi.mock("@/kit/daily.functions", () => ({
  getToday: async ({ data }: { data: { game: string; puzzleNo: number } }) => {
    const res = await today(deps, data);
    served.push(res);
    return res;
  },
  submitSolution: ({ data }: { data: Parameters<typeof submit>[1] }) => submit(deps, data),
  getResults: ({ data }: { data: Parameters<typeof results>[1] }) => results(deps, data),
}));

beforeAll(() => {
  // jsdom has no crypto.subtle; the seeds (puzzle and replay) need it.
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
});

describe("useGuardPuzzle", () => {
  it("counts every tap, even several before a re-render", async () => {
    localStorage.clear();
    const view = renderHook(() => useGuardPuzzle());
    await waitFor(() => expect(view.result.current.phase).toBe("playing"));
    const game = view.result.current;
    if (game.phase !== "playing") throw new Error(game.phase);
    // The same (stale) controls, three taps in one batch.
    act(() => {
      game.camp.add(0);
      game.camp.add(0);
      game.camp.add(1);
    });
    const after = view.result.current;
    if (after.phase !== "playing") throw new Error(after.phase);
    expect(after.camp.sessions.slice(0, 2)).toEqual([2, 1]);
    expect(after.camp.left).toBe(3);
    act(() => after.camp.reset());
    view.unmount();
    localStorage.clear();
  });

  it("plays a day end to end, and a reload shows the same result and the same fight", async () => {
    const first = renderHook(() => useGuardPuzzle());
    await waitFor(() => expect(first.result.current.phase).toBe("playing"));
    expect(JSON.stringify(served[0])).not.toContain("defence");

    // Spend all six sessions wherever they fit, as a player tapping + would.
    for (let tap = 0; tap < 6; tap++) {
      const game = first.result.current;
      if (game.phase !== "playing") throw new Error(game.phase);
      const i = game.scouting.stats.findIndex((_, j) => game.camp.canAdd(j));
      act(() => game.camp.add(i));
    }
    const ready = first.result.current;
    if (ready.phase !== "playing") throw new Error(ready.phase);
    expect(ready.camp.complete).toBe(true);
    expect(ready.camp.left).toBe(0);
    const camp = ready.camp.sessions;

    await act(() => ready.submit.submit());
    await waitFor(() => {
      const game = first.result.current;
      expect(game.phase === "done" && game.replay).toBeTruthy();
    });
    const done = first.result.current;
    if (done.phase !== "done") throw new Error(done.phase);
    expect(done.fresh).toBe(true);
    expect(done.results.yourCamp.reduce((a, c) => a + c.sessions, 0)).toBe(6);
    expect(done.results.betterThan).toBeNull(); // the only fighter so far
    expect(done.results.shareText).toMatch(/#\d+ \d+% → \d+% \(best \d+%\)$/);
    first.unmount();

    const again = renderHook(() => useGuardPuzzle());
    await waitFor(() => {
      const game = again.result.current;
      expect(game.phase === "done" && game.replay).toBeTruthy();
    });
    const reloaded = again.result.current;
    if (reloaded.phase !== "done") throw new Error(reloaded.phase);
    expect(reloaded.fresh).toBe(false);
    expect(reloaded.results.yours).toBe(done.results.yours);
    expect(reloaded.results.yourCamp).toEqual(done.results.yourCamp);
    expect(reloaded.replay).toEqual(done.replay);
    expect(camp.reduce((a, b) => a + b, 0)).toBe(6);
  });
});
