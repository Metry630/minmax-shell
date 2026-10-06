import { useEffect, useState } from "react";

import type { Colour } from "@/games/guard/plans";

// The colours, key and rules state game-plan Wordle's board shares (PlanBoard.tsx), in their own file
// so the board file exports only components (React fast refresh).

/**
 * Wordle's colours as backgrounds. The arcade palette has no green, so it's #2e7d3a (white text
 * 5.1:1) and the blocked grey #55556a (white 7:1), readable on both themes; yellow is the palette's.
 */
export const FILL: Record<Exclude<Colour, "⬜">, { background: string; color: string }> = {
  "🟩": { background: "#2e7d3a", color: "#ffffff" },
  "🟨": { background: "var(--arcade-hi)", color: "#141425" },
  "⬛": { background: "#55556a", color: "#ffffff" },
};

/** The colour key, under the grid and in the rules. */
export const KEY: { colour: Colour; short: string; words: string }[] = [
  { colour: "🟩", short: "gets through", words: "gets through" },
  {
    colour: "🟨",
    short: "wrong spot",
    words: "right finish, wrong spot (only from mount or the back)",
  },
  { colour: "⬛", short: "blocked", words: "blocked, and so is every move of that kind" },
  { colour: "⬜", short: "not tried", words: "not tried: the plan stopped at a block" },
];

/** Shown on a first visit (remembered in localStorage) and from the ? button. */
const RULES_SEEN = "minmax:guard:rules-seen";

/** The rules dialog's state: open on a first visit, then only from the ? button. */
export function useRules() {
  const [open, setOpen] = useState(false);
  // Storage can be blocked (private mode); then the rules open every visit, which is the safe side.
  useEffect(() => {
    try {
      if (!localStorage.getItem(RULES_SEEN)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(RULES_SEEN, "1");
    } catch {
      // Blocked storage: nothing to remember it in.
    }
  };
  return { open, show: () => setOpen(true), close };
}
