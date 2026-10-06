// A player's history for one game, in localStorage: no accounts, so this is where streaks live. Keyed
// by game because on workers.dev (and the hub, if it ever exists) every game shares one origin.

/** `won` is absent in older records and for games without wins and losses: those count as won. */
export type Result = { score: number; optimum: number; won?: boolean };
/** Puzzle number → result. Object keys are strings in JSON, so numbers go in as their decimal form. */
export type Results = Record<string, Result>;

const storageKey = (game: string) => `minmax:${game}:results`;

function isResult(value: unknown): value is Result {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Result).score === "number" &&
    typeof (value as Result).optimum === "number" &&
    ["boolean", "undefined"].includes(typeof (value as Result).won)
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
  /** Puzzles won (every played puzzle, for a game without losses). */
  won: number;
  /** Puzzles where the score was the optimum. */
  optimal: number;
  /**
   * Consecutive days won, ending today, or yesterday while today is still unplayed. A loss or a
   * missed day ends it, as in Wordle (Joshua, 2026-10-06: "count consecutive wins instead").
   */
  currentStreak: number;
  maxStreak: number;
};

export function summarize(results: Results, todayNo: number): Summary {
  const nos = Object.keys(results)
    .map(Number)
    .sort((a, b) => a - b);
  const wonOn = (n: number) => results[String(n)]?.won !== false;
  const won = new Set(nos.filter(wonOn));

  let maxStreak = 0;
  let run = 0;
  let previous = Number.NaN;
  for (const n of nos) {
    run = wonOn(n) ? (n === previous + 1 ? run + 1 : 1) : 0;
    maxStreak = Math.max(maxStreak, run);
    previous = n;
  }

  // Not having played today yet doesn't break the streak until today is over; losing today does.
  const played = new Set(nos);
  let currentStreak = 0;
  for (let n = played.has(todayNo) ? todayNo : todayNo - 1; won.has(n); n--) currentStreak++;

  const optimal = Object.values(results).filter((r) => r.score === r.optimum).length;
  return { played: nos.length, won: won.size, optimal, currentStreak, maxStreak };
}
