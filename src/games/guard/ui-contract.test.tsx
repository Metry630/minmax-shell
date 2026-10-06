import { act, renderHook, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { results, spar, submit, today, type Deps } from "@/kit/daily.core";
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
  sparSolution: ({ data }: { data: Parameters<typeof spar>[1] }) => spar(deps, data),
}));

beforeAll(() => {
  // jsdom has no crypto.subtle; the seeds (puzzle and replay) need it.
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
});

// Each test is a different day's crowd: a fresh score store, so "first fighter today" holds.
beforeEach(() => {
  deps.scores = memoryStore(new Map());
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

  it("spars three times, refuses a fourth, loads a sparred camp back, and shares the story", async () => {
    localStorage.clear();
    const view = renderHook(() => useGuardPuzzle());
    await waitFor(() => expect(view.result.current.phase).toBe("playing"));
    const playing = () => {
      const game = view.result.current;
      if (game.phase !== "playing") throw new Error(game.phase);
      return game;
    };
    expect(playing().spar).toMatchObject({ budget: 3, used: 0, left: 3, ready: false });
    // Three different camps, each sparred: all six sessions on one stat, a different stat each time.
    for (const stat of [0, 1, 2]) {
      act(() => playing().camp.reset());
      for (let tap = 0; tap < 6; tap++) act(() => playing().camp.add(stat));
      if (!playing().camp.complete) act(() => playing().camp.add(stat === 0 ? 3 : 0)); // capped stat
      while (!playing().camp.complete) {
        const i = playing().scouting.stats.findIndex((_, j) => playing().camp.canAdd(j));
        act(() => playing().camp.add(i));
      }
      expect(playing().spar.ready).toBe(true);
      await act(() => playing().spar.run());
      await waitFor(() => expect(playing().spar.running).toBe(false));
    }
    const after = playing();
    expect(after.spar).toMatchObject({ used: 3, left: 0, ready: false, error: null });
    expect(after.spar.history.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(
      after.spar.history[0]?.plan.every((row) => ["LOW", "MED", "HIGH"].includes(row.bandWord)),
    ).toBe(true);
    const firstCamp = after.spar.history[0]?.camp;
    act(() => after.spar.load(1));
    expect(playing().camp.sessions).toEqual(firstCamp);

    await act(() => playing().submit.submit());
    await waitFor(() => expect(view.result.current.phase).toBe("done"));
    const done = view.result.current;
    if (done.phase !== "done") throw new Error(done.phase);
    expect(done.results.spars).toHaveLength(3);
    expect(done.results.shareText).toMatch(/🥊 \d+ · \d+ · \d+ → \d+% \(best \d+%\)$/);
    view.unmount();
    localStorage.clear();
  });

  it("plays a day where crypto.randomUUID doesn't exist (a phone on plain HTTP)", async () => {
    localStorage.clear();
    // The server half of this test still needs crypto.subtle for puzzle seeds; the client half
    // (anon id, replay seed) must not need randomUUID or subtle at all.
    vi.stubGlobal("crypto", {
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
      subtle: webcrypto.subtle,
    });
    const view = renderHook(() => useGuardPuzzle());
    await waitFor(() => expect(view.result.current.phase).toBe("playing"));
    for (let tap = 0; tap < 6; tap++) {
      const game = view.result.current;
      if (game.phase !== "playing") throw new Error(game.phase);
      act(() => game.camp.add(game.scouting.stats.findIndex((_, j) => game.camp.canAdd(j))));
    }
    const ready = view.result.current;
    if (ready.phase !== "playing") throw new Error(ready.phase);
    await act(() => ready.submit.submit());
    await waitFor(() => {
      const game = view.result.current;
      expect(game.phase === "done" && game.replay).toBeTruthy();
    });
    expect(localStorage.getItem("minmax:anon")).toMatch(/^[0-9a-f-]{36}$/);
    view.unmount();
    vi.stubGlobal("crypto", webcrypto);
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
    expect(done.results.shareText).toMatch(/#\d+ \d+% \(best \d+%\)$/);
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
