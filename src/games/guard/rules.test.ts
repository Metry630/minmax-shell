// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CLAUSES, EVENT_IDS, RULEBOOK, SCORING_EVENTS, award, tally, type EventId } from "./rules";

// The hand-worked sequences in docs/guard/RULES.md, one-to-one. Each step is one technique and lists
// the events it triggers; [] is a technique that scores nothing (e.g. back to side control).
const SEQUENCES: [string, EventId[][], number[], number][] = [
  ["S1 takedown, pass, mount", [["takedown"], ["guard-pass"], ["mount"]], [2, 3, 4], 9],
  ["S2 pass straight to mount (3.4's example)", [["guard-pass", "mount"]], [7], 7],
  [
    "S3 pass, knee on belly, back to side control, knee on belly again (3.2)",
    [["guard-pass"], ["knee-on-belly"], [], ["knee-on-belly"]],
    [3, 2, 0, 0],
    5,
  ],
  [
    "S4 mount, back mount, mount again (4.4.1, then 3.2)",
    [["mount"], ["back-mount"], ["mount"]],
    [4, 4, 0],
    8,
  ],
  ["S5 mount, then take the back (distinct positions)", [["mount"], ["back-control"]], [4, 4], 8],
  [
    "S6 sweep, pass, mount, take the back",
    [["sweep"], ["guard-pass"], ["mount"], ["back-control"]],
    [2, 3, 4, 4],
    13,
  ],
  [
    "S7 every event once, then a repeat",
    [
      ["sweep"],
      [],
      ["takedown"],
      ["guard-pass"],
      ["knee-on-belly"],
      ["mount"],
      ["back-mount"],
      ["back-control"],
      ["guard-pass"],
    ],
    [2, 0, 2, 3, 2, 4, 4, 4, 0],
    21,
  ],
  ["S8 a line that scores nothing", [[], []], [0, 0], 0],
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
  it("reports what scored and keeps the state immutable", () => {
    const first = award(0, ["guard-pass", "mount"]);
    expect(first.scored).toEqual(["guard-pass", "mount"]);
    const again = award(first.awarded, ["mount", "back-control"]);
    expect(again).toMatchObject({ points: 4, scored: ["back-control"] });
    expect(award(first.awarded, ["mount"]).points).toBe(0);
  });

  it("the same event twice in one technique scores once", () => {
    expect(award(0, ["mount", "mount"]).points).toBe(4);
  });

  it("all seven events fit in 7 bits", () => {
    expect(award(0, [...EVENT_IDS]).awarded).toBe(0b1111111);
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
