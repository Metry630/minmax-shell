// Step 4's Done-when: `npx tsx scripts/check-graph.ts`. The checks live in src/games/guard/graph.check.ts.
import { EDGES, POSITIONS } from "../src/games/guard/graph";
import { checkGraph } from "../src/games/guard/graph.check";

const problems = checkGraph();
for (const problem of problems) console.error(`✗ ${problem}`);
const count = (kind: string) => EDGES.filter((edge) => edge.kind === kind).length;
console.log(
  problems.length === 0
    ? `graph ok: ${Object.keys(POSITIONS).length} positions, ${count("technique")} techniques, ` +
        `${count("escape")} opponent moves, ${count("submission")} submissions`
    : `${problems.length} problem(s)`,
);
process.exit(problems.length === 0 ? 0 : 1);
