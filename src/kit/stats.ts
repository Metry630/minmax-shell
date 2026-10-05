// A player's history for one game, in localStorage: no accounts, so this is where streaks live. Keyed
// by game because on workers.dev (and the hub, if it ever exists) every game shares one origin.

export type Result = { score: number; optimum: number };
/** Puzzle number → result. Object keys are strings in JSON, so numbers go in as their decimal form. */
export type Results = Record<string, Result>;

const storageKey = (game: string) => `minmax:${game}:results`;

function isResult(value: unknown): value is Result {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Result).score === "number" &&
    typeof (value as Result).optimum === "number"
  );
}

/** Empty on anything unexpected: storage blocked, corrupt JSON, an old shape. Never throws. */
export function loadResults(game: string): Results {
  try {
    const raw = localStorage.getItem(storageKey(game));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([n, result]) => /^\d+$/.test(n) && isResult(result)),
    );
  } catch {
    return {};
  }
}

/** Saves one result and returns the full history, which still holds it if storage is blocked. */
export function recordResult(game: string, puzzleNo: number, result: Result): Results {
  const results = { ...loadResults(game), [String(puzzleNo)]: result };
  try {
    localStorage.setItem(storageKey(game), JSON.stringify(results));
  } catch {
    // Storage blocked (private mode, some in-app browsers): stats last for this page only.
  }
  return results;
}

export type Summary = {
  played: number;
  /** Puzzles where the score was the optimum. */
  optimal: number;
  /** Consecutive days ending today, or yesterday while today is still unplayed. */
  currentStreak: number;
  maxStreak: number;
};

export function summarize(results: Results, todayNo: number): Summary {
  const nos = Object.keys(results)
    .map(Number)
    .sort((a, b) => a - b);
  const played = new Set(nos);

  let maxStreak = 0;
  let run = 0;
  let previous = Number.NaN;
  for (const n of nos) {
    run = n === previous + 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    previous = n;
  }

  // Not having played today yet doesn't break the streak until today is over.
  let currentStreak = 0;
  for (let n = played.has(todayNo) ? todayNo : todayNo - 1; played.has(n); n--) currentStreak++;

  const optimal = Object.values(results).filter((r) => r.score === r.optimum).length;
  return { played: nos.length, optimal, currentStreak, maxStreak };
}
