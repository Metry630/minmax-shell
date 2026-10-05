// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CLAUSES,
  EVENT_IDS,
  RULEBOOK,
  SCORING_EVENTS,
  START,
  award,
  tally,
  type Step,
} from "./rules";

// The hand-worked sequences in docs/guard/RULES.md, one-to-one. Each step is one move: the events a
// technique triggers ([] scores nothing, e.g. back to side control), or "escape" (the opponent's).
const SEQUENCES: [string, Step[], number[], number][] = [
  ["S1 takedown, pass, mount", [["takedown"], ["guard-pass"], ["mount"]], [2, 3, 4], 9],
  ["S2 pass straight to mount (3.4's example)", [["guard-pass", "mount"]], [7], 7],
  [
    "S3 pass, knee on belly, back to side control, knee on belly again (3.2)",
    [["guard-pass"], ["knee-on-belly"], [], ["knee-on-belly"]],
    [3, 2, 0, 0],
    5,
  ],
  ["S4 mount, back mount, mount (4.4.1)", [["mount"], ["back-mount"], ["mount"]], [4, 4, 4], 12],
  ["S5 mount, take the back, mount", [["mount"], ["back-control"], ["mount"]], [4, 4, 4], 12],
  [
    "S6 sweep, pass, mount, take the back",
    [["sweep"], ["guard-pass"], ["mount"], ["back-control"]],
    [2, 3, 4, 4],
    13,
  ],
  [
    "S7 every event once",
    [
      ["sweep"],
      [],
      ["takedown"],
      ["guard-pass"],
      ["knee-on-belly"],
      ["mount"],
      ["back-mount"],
      ["back-control"],
    ],
    [2, 0, 2, 3, 2, 4, 4, 4],
    21,
  ],
  ["S8 a line that scores nothing", [[], []], [0, 0], 0],
  ["S9 mount, step down to side control, mount (3.2)", [["mount"], [], ["mount"]], [4, 0, 0], 4],
  [
    "S10 mount, down to knee on belly, mount (no points going backwards)",
    [["mount"], ["knee-on-belly"], ["mount"]],
    [4, 0, 4],
    8,
  ],
  [
    "S11 the mount/back loop keeps scoring (step 5's game rule caps it)",
    [["mount"], ["back-control"], ["mount"], ["back-control"], ["mount"]],
    [4, 4, 4, 4, 4],
    20,
  ],
  [
    "S12 back mount, back control, back mount",
    [["back-mount"], ["back-control"], ["back-mount"]],
    [4, 4, 4],
    12,
  ],
  [
    "S13 mount, they re-guard, pass, mount",
    [["mount"], "escape", ["guard-pass"], ["mount"]],
    [4, 0, 3, 4],
    11,
  ],
  [
    "S14 pass, knee on belly, they push the knee off, knee on belly",
    [["guard-pass"], ["knee-on-belly"], "escape", ["knee-on-belly"]],
    [3, 2, 0, 2],
    7,
  ],
  [
    "S15 mount, down to side control, knee on belly (still going backwards)",
    [["mount"], [], ["knee-on-belly"]],
    [4, 0, 0],
    4,
  ],
  [
    "S16 takedown, they stand back up, takedown",
    [["takedown"], "escape", ["takedown"]],
    [2, 0, 2],
    4,
  ],
];

describe("tally", () => {
  it.each(SEQUENCES)("%s", (_name, steps, perStep, total) => {
    expect(tally(steps)).toEqual({ points: total, perStep });
  });

  it("an empty line scores 0", () => {
    expect(tally([])).toEqual({ points: 0, perStep: [] });
  });
});

describe("award", () => {
  it("reports what scored and leaves the input state alone", () => {
    const first = award(START, ["guard-pass", "mount"]);
    expect(first.scored).toEqual(["guard-pass", "mount"]);
    expect(first.state).toEqual({ last: "mount" });
    expect(START).toEqual({ last: null });
    expect(award(first.state, ["mount", "back-control"])).toMatchObject({
      points: 4,
      scored: ["back-control"],
    });
  });

  it("a technique with no event keeps the last position, so stepping back on pays nothing", () => {
    const steppedOff = award(award(START, ["mount"]).state, []).state;
    expect(steppedOff).toEqual({ last: "mount" });
    expect(award(steppedOff, ["mount"]).points).toBe(0);
  });

  it("an escape clears the slate", () => {
    const onMount = award(START, ["mount"]).state;
    expect(award(onMount, "escape")).toEqual({ state: START, points: 0, scored: [] });
  });

  it("the same event twice in one technique scores once", () => {
    expect(award(START, ["mount", "mount"]).points).toBe(4);
  });

  it("only knee on belly is pointless going backwards, and only from mount or the back", () => {
    for (const event of Object.values(SCORING_EVENTS)) {
      const expected = event.id === "knee-on-belly" ? ["back-control", "back-mount", "mount"] : [];
      expect([...event.notAfter].sort()).toEqual(expected);
    }
  });
});

describe("the table", () => {
  it("has exactly one entry per event id, keyed by its own id", () => {
    expect(Object.keys(SCORING_EVENTS).sort()).toEqual([...EVENT_IDS].sort());
    for (const [key, event] of Object.entries(SCORING_EVENTS)) expect(event.id).toBe(key);
  });

  const clauses = [...Object.values(SCORING_EVENTS), ...Object.values(CLAUSES)];

  it.each(clauses)("$article has a quote, a page and an article", (clause) => {
    expect(clause.quote.length).toBeGreaterThan(20);
    expect(clause.article).not.toBe("");
    expect(clause.page).toBeGreaterThanOrEqual(1);
    expect(clause.page).toBeLessThanOrEqual(RULEBOOK.pages);
  });

  it.each(Object.values(SCORING_EVENTS))("$id: heading states its points", (event) => {
    expect(event.heading).toContain(`(${event.points} points)`);
    expect(event.version).toBe(RULEBOOK.version);
  });
});

// The rule book's raw text is IBJJF's copyright and gitignored (.sources/), so this runs on Joshua's
// machine and skips in CI and forks. Recreate it with the fetch command in CLAUDE.md.
const SOURCE = fileURLToPath(
  new URL("../../../.sources/ibjjf/rules-v6.1.layout.txt", import.meta.url),
);
// pdftotext puts a form feed between pages, so page N is chunk N - 1.
const pages = existsSync(SOURCE) ? readFileSync(SOURCE, "utf8").split("\f") : null;

// Same normalisation on both sides: layout whitespace collapses, a line break after "-" or "/"
// ("his/ her") closes up, and curly quotes straighten. Dashes and typos stay as printed.
const normalize = (text: string) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/([-/]) /g, "$1")
    .trim();

describe.skipIf(!pages)("quotes match the rule book, page by page", () => {
  const page = (n: number) => normalize(pages?.[n - 1] ?? "");

  it("the saved text is the 52-page edition", () => {
    expect(pages?.filter((chunk) => chunk.trim() !== "").length).toBe(RULEBOOK.pages);
    expect(page(17)).toContain("VERSION 6.1 2024");
  });

  it.each([...Object.values(SCORING_EVENTS), ...Object.values(CLAUSES)])(
    "$article on page $page",
    ({ quote, page: n }) => {
      expect(page(n)).toContain(normalize(quote));
    },
  );

  it.each(Object.values(SCORING_EVENTS))("$id heading on page $page", ({ heading, page: n }) => {
    expect(page(n)).toContain(normalize(heading));
  });
});
