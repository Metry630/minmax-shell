// Puzzle numbers. A puzzle belongs to the player's *local* calendar date, like Wordle, so it rolls
// over at their midnight; a UTC rollover would land at 8 pm US Eastern for a mostly American
// audience (DECISIONS 2026-10-05). The server only checks that the number is plausible.

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 of the calendar date at instant `ms`, in a zone `offsetMin` ahead of UTC. */
export function dayNumberAt(ms: number, offsetMin: number): number {
  return Math.floor((ms + offsetMin * 60_000) / DAY_MS);
}

export function localDayNumber(date: Date): number {
  // getTimezoneOffset() counts minutes *behind* UTC (New York in summer: 240), hence the minus.
  // It's per instant, so DST is handled.
  return dayNumberAt(date.getTime(), -date.getTimezoneOffset());
}

export function utcDayNumber(date: Date): number {
  return dayNumberAt(date.getTime(), 0);
}

/** Day number of a "YYYY-MM-DD" date: a game's epoch, the local date of its puzzle #1. */
export function epochDay(epoch: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(epoch);
  if (!match) throw new Error(`Epoch must be YYYY-MM-DD, got "${epoch}"`);
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** The puzzle a player should see now: computed in the browser, from their local date. */
export function localPuzzleNo(epoch: string, date: Date): number {
  return localDayNumber(date) - epochDay(epoch) + 1;
}

export function utcPuzzleNo(epoch: string, date: Date): number {
  return utcDayNumber(date) - epochDay(epoch) + 1;
}

export type PuzzleWindow = "open" | "closed" | "not_open";

/**
 * Whether the server takes puzzle `n` right now. Time zones run from UTC−12 to UTC+14, so a player's
 * local date is always the UTC date −1, 0 or +1 (day.test.ts sweeps every zone to check), and
 * anything outside that window is either over or not out yet.
 */
export function puzzleWindow(epoch: string, n: number, now: Date): PuzzleWindow {
  const utcNo = utcPuzzleNo(epoch, now);
  if (n < 1 || n > utcNo + 1) return "not_open";
  if (n < utcNo - 1) return "closed";
  return "open";
}
