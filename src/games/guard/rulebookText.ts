// Tests only (node:fs): the rule book's raw text, split into pages. The text is IBJJF's copyright and
// gitignored (.sources/), so `pages` is null in CI and forks and the tests that need it skip.
// Recreate it with the fetch command in CLAUDE.md.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = fileURLToPath(
  new URL("../../../.sources/ibjjf/rules-v6.1.layout.txt", import.meta.url),
);

// pdftotext puts a form feed between pages, so page N is chunk N - 1.
export const pages = existsSync(SOURCE) ? readFileSync(SOURCE, "utf8").split("\f") : null;

// Same normalisation on both sides: layout whitespace collapses, a line break after "-" or "/"
// ("his/ her") closes up, and curly quotes straighten. Dashes and typos stay as printed.
export const normalize = (text: string) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/([-/]) /g, "$1")
    .trim();

/** Page n of the rule book, normalised; empty when the text isn't present. */
export const page = (n: number) => normalize(pages?.[n - 1] ?? "");
