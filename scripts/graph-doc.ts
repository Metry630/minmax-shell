// Regenerates docs/guard/GRAPH.md from src/games/guard/graph.ts: `npx tsx scripts/graph-doc.ts`.
import { writeFileSync } from "node:fs";

import { graphMarkdown } from "../src/games/guard/graph.doc";

writeFileSync(new URL("../docs/guard/GRAPH.md", import.meta.url), graphMarkdown());
console.log("wrote docs/guard/GRAPH.md");
