import type { Goal } from "./game";
import type { Bucket } from "./scores.server";

// "Better than X% of players" from the day's histogram. The histogram includes your own row, so you
// are compared with everyone else; a tie counts as not beating them.

/** Percent (0 to 100, rounded down) of the other players you beat; null when nobody else has played. */
export function betterThan(buckets: readonly Bucket[], score: number, goal: Goal): number | null {
  let others = -1; // your own row is in the histogram
  let beaten = 0;
  for (const { value, count } of buckets) {
    others += count;
    if (goal === "max" ? value < score : value > score) beaten += count;
  }
  if (others <= 0) return null;
  // Floor, so 100% means you beat every single other player.
  return Math.floor((100 * beaten) / others);
}
