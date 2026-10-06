// Writes solver-verified puzzles into D1's `puzzles` table. The minimal version, pulled forward from
// step 7 so step 6 can be played on the deployed Worker (DECISIONS 2026-10-06):
//
//   npx tsx scripts/schedule.ts --game guard (--local | --remote) [--from N] [--days 5] [--dev-salt]
//
// Default range: yesterday's puzzle number (UTC) through 3 days ahead, since a player's local date
// can trail UTC by a day. The real salt comes from .dev.vars and is never printed; the SQL goes to
// the gitignored schedule-export/. A puzzle whose quality check fails stops the run (step 7 adds
// drawing again from the same seed, the epoch move and --days 90).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { games } from "../src/games/registry";
import { utcPuzzleNo } from "../src/kit/day";
import { generateChecked } from "../src/kit/puzzles.server";
import { DEV_SALT } from "../src/kit/seed";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function realSalt(): string {
  try {
    const line = readFileSync(".dev.vars", "utf8")
      .split("\n")
      .find((l) => l.startsWith("PUZZLE_SALT="));
    const salt = line?.slice("PUZZLE_SALT=".length).trim().replace(/^"|"$/g, "");
    if (salt) return salt;
  } catch {
    // fall through to the error below
  }
  throw new Error("No PUZZLE_SALT in .dev.vars; pass --dev-salt to schedule public dev puzzles");
}

const gameId = arg("game");
const module = gameId ? games[gameId] : undefined;
if (!module) throw new Error(`--game must be one of: ${Object.keys(games).join(", ")}`);
const target = flag("remote") ? "--remote" : flag("local") ? "--local" : undefined;
if (!target) throw new Error("Pass --local or --remote");
// The public salt is only for local testing: on the Worker it would publish puzzles anyone can
// regenerate from the open-source generator.
if (flag("dev-salt") && target === "--remote") throw new Error("--dev-salt is for --local only");
const salt = flag("dev-salt") ? DEV_SALT : realSalt();

// Puzzle numbers start at 1, so on the epoch day itself there is no yesterday.
const from = Number(arg("from") ?? Math.max(1, utcPuzzleNo(module.epoch, new Date()) - 1));
const days = Number(arg("days") ?? 5);
if (!Number.isInteger(from) || from < 1 || !Number.isInteger(days) || days < 1) {
  throw new Error("--from and --days must be positive integers");
}

// SQL string literal: single quotes doubled. JSON from our own generator, so nothing else to escape.
const literal = (value: unknown) => `'${JSON.stringify(value).replace(/'/g, "''")}'`;

const statements: string[] = [];
for (let n = from; n < from + days; n++) {
  const checked = await generateChecked(module, salt, n);
  if (!checked) throw new Error(`${module.id} #${n} failed its quality check; nothing written`);
  statements.push(
    `INSERT OR REPLACE INTO puzzles (game, puzzle_no, puzzle, optimum, quality) VALUES (` +
      `'${module.id}', ${n}, ${literal(checked.puzzle)}, ${literal(checked.optimum)}, ` +
      `${literal(checked.quality)});`,
  );
}

mkdirSync("schedule-export", { recursive: true });
const file = `schedule-export/${module.id}-${from}-${from + days - 1}.sql`;
writeFileSync(file, statements.join("\n") + "\n");
execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "minmax", target, "--config", "wrangler.jsonc", "--file", file],
  { stdio: ["ignore", "ignore", "inherit"] },
);
console.log(
  `${module.id}: puzzles #${from} to #${from + days - 1} written to D1 (${target.slice(2)}, ` +
    `${flag("dev-salt") ? "dev" : "real"} salt)`,
);
