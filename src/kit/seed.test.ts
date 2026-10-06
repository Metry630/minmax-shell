// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { DEV_SALT, resolveSalt, rngFor, seedFor, sfc32, stringSeed } from "./seed";

// rngFor("dev", "demo", 1), five int(0, 999) draws. Checked against an independent reference
// (node:crypto HMAC + bryc's sfc32, github.com/bryc/code jshash/PRNGs.md) on 2026-10-05. If this
// breaks, every salt now generates different puzzles: fix the PRNG, don't update the numbers.
const GOLDEN = [414, 308, 50, 93, 569];

describe("seedFor", () => {
  it("matches an independent HMAC-SHA256 (node:crypto)", async () => {
    const mac = createHmac("sha256", "s3cret").update("guard:12").digest();
    const expected = [0, 4, 8, 12].map((i) => mac.readUInt32BE(i));
    expect(await seedFor("s3cret", "guard", 12)).toEqual(expected);
  });

  it("changes with the salt, the game and the puzzle number", async () => {
    const base = await seedFor("s3cret", "guard", 12);
    expect(await seedFor("other", "guard", 12)).not.toEqual(base);
    expect(await seedFor("s3cret", "mise", 12)).not.toEqual(base);
    expect(await seedFor("s3cret", "guard", 13)).not.toEqual(base);
  });

  it("is deterministic", async () => {
    const first = await seedFor("s3cret", "guard", 12);
    const second = await seedFor("s3cret", "guard", 12);
    expect(first).toEqual(second);
  });
});

describe("resolveSalt", () => {
  it.each([
    [undefined, "dev"],
    ["", "dev"],
    ["abc", "abc"],
  ])("resolves %s to %s", (input, expected) => {
    expect(resolveSalt(input)).toBe(expected);
  });

  it("has DEV_SALT as 'dev'", () => {
    expect(DEV_SALT).toBe("dev");
  });
});

describe("sfc32", () => {
  const SEED = [1, 2, 3, 4] as const;

  it("produces the same sequence from the same seed", () => {
    const rng1 = sfc32(SEED);
    const rng2 = sfc32(SEED);
    const draws1 = Array.from({ length: 1000 }, () => rng1.next());
    const draws2 = Array.from({ length: 1000 }, () => rng2.next());
    expect(draws1).toEqual(draws2);
  });

  it("keeps next() in [0, 1)", () => {
    const rng = sfc32(SEED);
    const draws = Array.from({ length: 10000 }, () => rng.next());
    expect(draws.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("covers both ends of int(1, 6) over many draws", () => {
    const rng = sfc32(SEED);
    const set = new Set<number>();
    for (let i = 0; i < 6000; i++) {
      set.add(rng.int(1, 6));
    }
    expect([...set].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("throws RangeError for invalid int() arguments", () => {
    const rng = sfc32(SEED);
    expect(() => rng.int(3, 2)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
    expect(() => rng.int(0, Infinity)).toThrow(RangeError);
  });

  it("picks elements from a list and throws on empty list", () => {
    const rng = sfc32(SEED);
    const list = ["a", "b", "c"];
    const picks = new Set<string>();
    for (let i = 0; i < 100; i++) {
      picks.add(rng.pick(list));
    }
    expect([...picks]).toEqual(expect.arrayContaining(list));
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it("shuffles and leaves the input alone", () => {
    const rng = sfc32(SEED);
    const input = Array.from({ length: 10 }, (_, i) => i + 1);
    const original = [...input];
    const out = rng.shuffle(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual(original);
  });

  it("rngFor produces the same sequence as sfc32 from seedFor", async () => {
    const seed = await seedFor("dev", "demo", 1);
    const rng1 = sfc32(seed);
    const rng2 = await rngFor("dev", "demo", 1);
    const draws1 = Array.from({ length: 20 }, () => rng1.next());
    const draws2 = Array.from({ length: 20 }, () => rng2.next());
    expect(draws2).toEqual(draws1);
  });
});

describe("pinned output", () => {
  it("pins the first draws for the dev salt", async () => {
    const rng = await rngFor("dev", "demo", 1);
    expect(Array.from({ length: 5 }, () => rng.int(0, 999))).toEqual(GOLDEN);
  });
});

describe("stringSeed", () => {
  it("is repeatable, spreads nearby strings apart, and needs no WebCrypto", () => {
    const a = stringSeed("anon-1:guard-replay:12");
    expect(stringSeed("anon-1:guard-replay:12")).toEqual(a);
    expect(stringSeed("anon-1:guard-replay:13")).not.toEqual(a);
    expect(a.every((w) => Number.isInteger(w) && w >= 0 && w < 2 ** 32)).toBe(true);
    // Feeds sfc32 like any other seed.
    const r = sfc32(a);
    expect(r.next()).toBe(sfc32(stringSeed("anon-1:guard-replay:12")).next());
  });
});
