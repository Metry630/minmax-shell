import { BELT_TABLE, EDGES, POSITIONS, type Edge, type Kind, type PositionSpec } from "./graph";
import { EVENT_IDS, type EventId } from "./rules";

// Checks the graph against rules.ts and docs/guard/RULES.md. Run by scripts/check-graph.ts (step 4's
// Done-when) and by graph.test.ts in CI. Returns problems as sentences; an empty list means it passes.

/** Positions a guard pass can end in: 4.2 says side control or north-south; 3.4 adds the chain. */
const PASSED: readonly Kind[] = ["side-control", "north-south", "knee-on-belly", "mount"];

/** Arriving on top here credits this position's event (4.3, 4.4, 4.5). */
const POSITION_EVENT: Partial<Record<Kind, EventId>> = {
  "knee-on-belly": "knee-on-belly",
  mount: "mount",
  "back-mount": "back-mount",
  "back-control": "back-control",
};

/**
 * The events a move from `from` to `to` should list, from the positions alone:
 * - standing to any top position: takedown (4.1.1, 4.1.2);
 * - from bottom in a guard to any top position, the back included: sweep (4.6.1; 4.6.2, whose photos
 *   on p.23 show an arm drag from seated guard ending behind an opponent on all fours);
 * - from top in a guard to side control, north-south, knee on belly or mount: guard pass (4.2, 3.4).
 *   Not to the back, and not from turtle: a pass surmounts the legs of someone in guard or half guard
 *   and ends in side control or north-south (4.2); ending behind a turtled opponent is an advantage
 *   (5.6.2);
 * - arriving on top in knee on belly, mount, back mount or back control: that event too (3.4).
 * Reversals from a pin or turtle score nothing, since a sweep starts in guard (4.6, RULES.md choice
 * 5), and so does a takedown or sweep landing past the legs as far as the pass goes (choice 5).
 */
export function expectedEvents(from: PositionSpec, to: PositionSpec): EventId[] {
  if (to.perspective !== "top") return [];
  const events: EventId[] = [];
  if (from.kind === "standing") events.push("takedown");
  else if (from.kind === "guard" && from.perspective === "bottom") events.push("sweep");
  else if (from.kind === "guard" && PASSED.includes(to.kind)) events.push("guard-pass");
  const arrived = POSITION_EVENT[to.kind];
  if (arrived) events.push(arrived);
  return events;
}

export type Graph = { positions: Record<string, PositionSpec>; edges: readonly Edge[] };

const hasNumber = (value: unknown): boolean =>
  typeof value === "number" ||
  (Array.isArray(value) && value.some(hasNumber)) ||
  (typeof value === "object" && value !== null && Object.values(value).some(hasNumber));

export function checkGraph(graph: Graph = { positions: POSITIONS, edges: EDGES }): string[] {
  const problems: string[] = [];
  const { positions, edges } = graph;
  if (!("standing" in positions)) problems.push("there is no standing position");

  const seen = new Set<string>();
  for (const edge of edges) {
    if (seen.has(edge.id)) problems.push(`${edge.id}: duplicate id`);
    seen.add(edge.id);

    const from = positions[edge.from];
    if (!from) problems.push(`${edge.id}: unknown position ${edge.from}`);
    if (hasNumber(edge))
      problems.push(`${edge.id}: carries a number; point values live in rules.ts`);

    if (edge.kind === "technique") {
      const to = positions[edge.to];
      if (!to) problems.push(`${edge.id}: unknown position ${edge.to}`);
      for (const id of edge.events) {
        if (!(EVENT_IDS as readonly string[]).includes(id))
          problems.push(`${edge.id}: unknown event ${id}`);
      }
      if (from && to && !edge.why) {
        const expected = expectedEvents(from, to);
        if (expected.join() !== edge.events.join()) {
          problems.push(
            `${edge.id}: lists [${edge.events.join(", ")}] but the positions say [${expected.join(", ")}]; fix it or add a why`,
          );
        }
      }
    } else if (edge.kind === "escape") {
      if (!positions[edge.to]) problems.push(`${edge.id}: unknown position ${edge.to}`);
      if ("events" in edge) problems.push(`${edge.id}: the opponent's moves carry no events`);
    } else {
      const belt = edge.tableRow === undefined ? "white" : BELT_TABLE[edge.tableRow];
      if (belt === undefined) problems.push(`${edge.id}: ${edge.tableRow} isn't in BELT_TABLE`);
      else if (belt === null) problems.push(`${edge.id}: ${edge.tableRow} is illegal in the gi`);
      else if (belt !== edge.minBelt)
        problems.push(`${edge.id}: minBelt ${edge.minBelt}, table says ${belt}`);
    }
  }

  // Reachability over moves that change position: yours and the opponent's.
  const next = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.kind === "submission") continue;
    next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to]);
  }
  const reach = (start: string) => {
    const found = new Set([start]);
    const queue = [start];
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      for (const to of next.get(id) ?? []) {
        if (!found.has(to)) {
          found.add(to);
          queue.push(to);
        }
      }
    }
    return found;
  };
  const fromStanding = reach("standing");
  for (const [id, spec] of Object.entries(positions)) {
    if (!edges.some((edge) => edge.from === id)) problems.push(`${id}: no moves out of it`);
    if (spec.startOnly) {
      if (fromStanding.has(id))
        problems.push(`${id}: marked start-only but reachable from standing`);
      const joins = [...reach(id)].some((other) => !positions[other]?.startOnly);
      if (!joins) problems.push(`${id}: start-only and can't reach the rest of the graph`);
    } else if (!fromStanding.has(id)) {
      problems.push(`${id}: not reachable from standing`);
    }
  }
  return problems;
}
