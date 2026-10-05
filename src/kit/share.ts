import type { Goal } from "./game";

// The share text, Wordle-style: the game's domain and number, then a 10-cell bar of how close the
// score came to the optimum.
//
//   armbar.day #12
//   🟩🟩🟩🟩🟩🟩🟩🟩⬛⬛ 14/17

const CELLS = 10;

/** How much of the optimum a score reached, in [0, 1]. Exactly 1 only when it *is* the optimum. */
export function fractionOfOptimum(score: number, optimum: number, goal: Goal): number {
  if (goal === "max" ? score >= optimum : score <= optimum) return 1;
  const fraction = goal === "max" ? score / optimum : optimum / score;
  // Zero or negative optima (a comeback objective, say) have no meaningful ratio below the optimum.
  return Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
}

export type ShareInput = {
  domain: string;
  puzzleNo: number;
  score: number;
  optimum: number;
  goal: Goal;
};

export function shareText({ domain, puzzleNo, score, optimum, goal }: ShareInput): string {
  // Floor, so 16/17 shows 9 cells: a full bar always means the optimum.
  const filled = Math.floor(fractionOfOptimum(score, optimum, goal) * CELLS);
  return `${domain} #${puzzleNo}\n${"🟩".repeat(filled)}${"⬛".repeat(CELLS - filled)} ${score}/${optimum}`;
}

/** Phones get the share sheet; everything else gets the clipboard, as Wordle does. */
export async function shareResult(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    // Cancelled share sheet, or clipboard blocked.
    return "failed";
  }
}
