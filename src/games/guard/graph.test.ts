// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BELT_TABLE, EDGES, POSITIONS, type Edge, type PositionSpec } from "./graph";
import { checkGraph, expectedEvents, type Graph } from "./graph.check";
import { graphMarkdown } from "./graph.doc";
import { page, pages } from "./rulebookText";

const real: Graph = { positions: POSITIONS, edges: EDGES };

/** The real graph with one edge replaced (or dropped, with null). */
const withEdge = (id: string, change: (edge: Edge) => Edge | null): Graph => ({
  positions: POSITIONS,
  edges: EDGES.flatMap((edge) => {
    if (edge.id !== id) return [edge];
    const changed = change(edge);
    return changed ? [changed] : [];
  }),
});

describe("checkGraph", () => {
  it("passes on the real graph", () => {
    expect(checkGraph(real)).toEqual([]);
  });

  // Each planted mistake must be caught; otherwise "passes" above means nothing.
  it("catches a move listing the wrong events", () => {
    const graph = withEdge("scissor-sweep", (edge) => ({ ...edge, events: ["sweep"] }) as Edge);
    expect(checkGraph(graph)).toEqual([
      "scissor-sweep: lists [sweep] but the positions say [sweep, mount]; fix it or add a why",
    ]);
  });

  it("accepts a mismatch only with a reason", () => {
    const graph = withEdge(
      "scissor-sweep",
      (edge) => ({ ...edge, events: ["sweep"], why: "test" }) as Edge,
    );
    expect(checkGraph(graph)).toEqual([]);
  });

  it("catches a number on an edge", () => {
    // The types already forbid it; this is the runtime check for data that slips past them.
    const graph = withEdge("knee-slice", (edge) => ({ ...edge, points: 3 }) as unknown as Edge);
    expect(checkGraph(graph)).toEqual([
      "knee-slice: carries a number; point values live in rules.ts",
    ]);
  });

  it("catches an unknown event", () => {
    const graph = withEdge(
      "knee-slice",
      (edge) => ({ ...edge, events: ["guard-pass", "advantage"] }) as Edge,
    );
    expect(checkGraph(graph)).toContain("knee-slice: unknown event advantage");
  });

  it("catches a position nothing leads to", () => {
    const graph = withEdge("side-to-north-south", () => null);
    expect(checkGraph(graph)).toEqual(["north-south-top: not reachable from standing"]);
  });

  it("catches a dead end", () => {
    const graph = withEdge("north-south-to-side", () => null);
    const problems = checkGraph({
      ...graph,
      edges: graph.edges.filter((edge) => edge.from !== "north-south-top"),
    });
    expect(problems).toContain("north-south-top: no moves out of it");
  });

  it("keeps the start-only flag honest", () => {
    const positions: Record<string, PositionSpec> = {
      ...POSITIONS,
      "turtle-top": { ...POSITIONS["turtle-top"], startOnly: true },
    };
    expect(checkGraph({ positions, edges: EDGES })).toEqual([
      "turtle-top: marked start-only but reachable from standing",
    ]);
  });

  it("catches a belt that disagrees with the table", () => {
    const graph = withEdge(
      "single-leg-x-knee-bar",
      (edge) => ({ ...edge, minBelt: "blue" }) as Edge,
    );
    expect(checkGraph(graph)).toEqual(["single-leg-x-knee-bar: minBelt blue, table says brown"]);
  });

  it("catches an opponent's move that scores", () => {
    const graph = withEdge("they-turtle", (edge) => ({ ...edge, events: ["takedown"] }) as Edge);
    expect(checkGraph(graph)).toEqual(["they-turtle: the opponent's moves carry no events"]);
  });
});

describe("expectedEvents", () => {
  const p = POSITIONS;
  it.each([
    ["pulling guard", p.standing, p["closed-guard-bottom"], []],
    ["a takedown into guard", p.standing, p["closed-guard-top"], ["takedown"]],
    ["a takedown landing past the legs: no pass", p.standing, p["side-control-top"], ["takedown"]],
    ["a sweep to mount", p["closed-guard-bottom"], p["mount-top"], ["sweep", "mount"]],
    [
      "a sweep to the back",
      p["de-la-riva-bottom"],
      p["back-control-top"],
      ["sweep", "back-control"],
    ],
    [
      "a pass to knee on belly",
      p["open-guard-top"],
      p["knee-on-belly-top"],
      ["guard-pass", "knee-on-belly"],
    ],
    ["guard to the back: no pass", p["open-guard-top"], p["back-control-top"], ["back-control"]],
    ["upa: a reversal, not a sweep", p["mount-bottom"], p["closed-guard-top"], []],
    ["turtle to side control: no pass", p["turtle-top"], p["side-control-top"], []],
    ["escaping to your guard", p["side-control-bottom"], p["half-guard-bottom"], []],
  ] as const)("%s", (_name, from, to, events) => {
    expect(expectedEvents(from, to)).toEqual(events);
  });
});

describe("the data", () => {
  it("keeps heel hooks and anything else illegal in the gi out", () => {
    const illegal = Object.keys(BELT_TABLE).filter((row) => BELT_TABLE[row] === null);
    expect(illegal).toContain("Heel hook");
    for (const edge of EDGES) {
      if (edge.kind === "submission" && edge.tableRow) expect(illegal).not.toContain(edge.tableRow);
    }
  });

  it("every position has an English or Portuguese alias", () => {
    for (const spec of Object.values(POSITIONS)) expect(spec.aliases.length).toBeGreaterThan(0);
  });
});

describe("docs/guard/GRAPH.md", () => {
  it("is up to date with graph.ts (regenerate: npx tsx scripts/graph-doc.ts)", () => {
    const committed = readFileSync(
      new URL("../../../docs/guard/GRAPH.md", import.meta.url),
      "utf8",
    );
    expect(committed).toBe(graphMarkdown());
  });
});

// Needs the rule book's text from .sources/ (rulebookText.ts), so it skips in CI and forks.
describe.skipIf(!pages)("the belt table matches the rule book", () => {
  it.each(Object.keys(BELT_TABLE))("%s is a row on page 29", (row) => {
    expect(page(29)).toContain(row);
  });
});
