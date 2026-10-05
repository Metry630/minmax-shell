import { EDGES, POSITIONS, type Edge, type PositionId, type SubmissionEdge } from "./graph";
import { SCORING_EVENTS, award, type EventId } from "./rules";

// Writes docs/guard/GRAPH.md, the review copy of graph.ts (scripts/graph-doc.ts). graph.test.ts fails
// if the committed file differs, so the document Joshua signs off is always the data.

const STATUS = "Awaiting Joshua's sign-off.";

const ids = Object.keys(POSITIONS) as PositionId[];
const name = (id: PositionId) => POSITIONS[id].name;
const node = (id: PositionId) => id.replaceAll("-", "_");

/** The event a position credits when you're on top in it, if any; used to price moves out of it. */
const credited = (id: PositionId): EventId | null => {
  const { kind, perspective } = POSITIONS[id];
  const event = SCORING_EVENTS[kind as EventId];
  return perspective === "top" && event ? event.id : null;
};

/** What a move pays if the position you're leaving was the last one credited. */
const pays = (from: PositionId, events: readonly EventId[]) =>
  award({ last: credited(from) }, events).points;

const eventList = (events: readonly EventId[]) =>
  events.length === 0
    ? "none"
    : events.map((id) => SCORING_EVENTS[id].name.toLowerCase()).join(" + ");

const belt = (edge: SubmissionEdge) =>
  edge.minBelt === "white" ? "all belts" : `${edge.minBelt} belt and up`;

function mermaid(): string {
  const groups: [string, (id: PositionId) => boolean][] = [
    ["Standing", (id) => POSITIONS[id].perspective === "neutral"],
    [
      "Your guard",
      (id) => POSITIONS[id].kind === "guard" && POSITIONS[id].perspective === "bottom",
    ],
    ["Their guard", (id) => POSITIONS[id].kind === "guard" && POSITIONS[id].perspective === "top"],
    [
      "You in control",
      (id) => POSITIONS[id].kind !== "guard" && POSITIONS[id].perspective === "top",
    ],
    [
      "Under control",
      (id) => POSITIONS[id].kind !== "guard" && POSITIONS[id].perspective === "bottom",
    ],
  ];
  const lines = ["```mermaid", "flowchart LR"];
  groups.forEach(([title, member], i) => {
    lines.push(`  subgraph g${i}["${title}"]`);
    for (const id of ids.filter(member)) lines.push(`    ${node(id)}["${name(id)}"]`);
    lines.push("  end");
  });
  const pairs = new Set<string>();
  for (const edge of EDGES) {
    if (edge.kind === "submission") continue;
    const arrow = edge.kind === "escape" ? "-.->" : "-->";
    const line = `  ${node(edge.from)} ${arrow} ${node(edge.to)}`;
    if (!pairs.has(line)) pairs.add(line);
  }
  lines.push(...pairs, "```");
  return lines.join("\n");
}

function positionBlock(id: PositionId): string {
  const from = EDGES.filter((edge) => edge.from === id);
  const moves = from.filter(
    (edge): edge is Extract<Edge, { kind: "technique" }> => edge.kind === "technique",
  );
  const subs = from.filter((edge): edge is SubmissionEdge => edge.kind === "submission");
  const theirs = from.filter(
    (edge): edge is Extract<Edge, { kind: "escape" }> => edge.kind === "escape",
  );
  const spec = POSITIONS[id];
  const out = [`### ${spec.name}`, ""];
  const tags = [`\`${id}\``, ...("startOnly" in spec ? ["start-only"] : [])];
  out.push(`${tags.join(", ")}. Also called: ${spec.aliases.join(", ")}.`, "");
  if (moves.length > 0) {
    out.push("| Move | To | Events | Points |", "|---|---|---|---|");
    for (const edge of moves) {
      const label = edge.aliases
        ? `${edge.technique} (${edge.aliases.join(", ")})`
        : edge.technique;
      out.push(
        `| ${label} | ${name(edge.to)} | ${eventList(edge.events)} | ${pays(id, edge.events)} |`,
      );
    }
    out.push("");
  }
  if (subs.length > 0) {
    out.push(`Submissions: ${subs.map((edge) => `${edge.name} (${belt(edge)})`).join(", ")}.`, "");
  }
  if (theirs.length > 0) {
    out.push(
      `Their moves from here: ${theirs.map((edge) => `${edge.name} → ${name(edge.to)}`).join("; ")}.`,
      "",
    );
  }
  return out.join("\n");
}

export function graphMarkdown(): string {
  const count = (kind: Edge["kind"]) => EDGES.filter((edge) => edge.kind === kind).length;
  const exceptions = EDGES.filter((edge) => edge.kind === "technique" && edge.why);
  const tableSubs = EDGES.filter(
    (edge): edge is SubmissionEdge => edge.kind === "submission" && !!edge.tableRow,
  );
  const rows = [...new Set(tableSubs.map((edge) => edge.tableRow))];

  return [
    "# Guard to Sub: position graph",
    "",
    "<!-- Generated from src/games/guard/graph.ts by `npx tsx scripts/graph-doc.ts`. Don't edit by hand. -->",
    "",
    `${STATUS} ${ids.length} positions, ${count("technique")} techniques, ${count("escape")} opponent ` +
      `moves, ${count("submission")} submissions. \`npx tsx scripts/check-graph.ts\` checks it.`,
    "",
    "## How to read it",
    "",
    '- **You\'re always the player.** "Top" positions are the ones you control (on top in their guard,',
    '  on their back); "bottom" ones have you controlled.',
    "- **Start-only** positions can't be reached from standing, because only the opponent's offense gets",
    "  you there and the opponent doesn't attack. A puzzle can start in one (a comeback, say).",
    "- **Their moves** are the opponent's escapes and guard plays. They score nothing, and in scoring",
    "  they wipe the memory of what you last scored (RULES.md, choice 1). Step 5's daily opponent decides",
    "  which ones happen.",
    "- **Points** is what the move pays if the position you're leaving was the last one you scored. In a",
    "  real line `rules.ts` decides, so the same move can pay less (stepping down from mount to knee on",
    "  belly pays 0).",
    "",
    "## Which moves score",
    "",
    "Every move lists its events, and `graph.check.ts` re-derives them from the two positions, so a",
    "move that disagrees fails the check unless it explains why.",
    "",
    "| Move | Events | Source |",
    "|---|---|---|",
    "| standing to any top position | takedown | 4.1.1, 4.1.2 |",
    "| bottom of a guard to any top position, the back included | sweep | 4.6.1, 4.6.2 |",
    "| top of a guard to side control, north-south, knee on belly or mount | guard pass | 4.2, 3.4 |",
    "| arriving on top in knee on belly, mount, back mount or back control | that position, added | 3.4, 4.3 to 4.5 |",
    "| reversals from a pin or turtle, pulling guard, their moves | none | 4.6 (a sweep starts in guard), choice 5 |",
    "",
    `Exceptions with a reason: ${
      exceptions.length === 0
        ? "none."
        : exceptions
            .map((edge) => `\`${edge.id}\` (${edge.kind === "technique" ? edge.why : ""})`)
            .join("; ")
    }`,
    "",
    "## Belts",
    "",
    "Submissions are gi, adult. The rule book's illegal-moves table (p.29, 6.2.3 M) sets the lowest belt",
    "for each hold it lists; anything it doesn't list is legal for all adults. Heel hooks and knee",
    "reaping are illegal in the gi at every belt, so they're not here. Rows used:",
    "",
    "| Row on p.29 | Lowest belt | Used by |",
    "|---|---|---|",
    ...rows.map((row) => {
      const users = tableSubs.filter((edge) => edge.tableRow === row);
      return `| ${row} | ${users[0]?.minBelt} | ${users.map((edge) => `\`${edge.id}\``).join(", ")} |`;
    }),
    "",
    "## Map",
    "",
    "Solid arrows are your moves, dotted ones the opponent's. Submissions aren't drawn.",
    "",
    mermaid(),
    "",
    "## Positions and moves",
    "",
    ...ids.map(positionBlock),
  ].join("\n");
}
