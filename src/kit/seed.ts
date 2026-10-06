// Seeded randomness for generators. The generator is public (Apache-2.0), so a puzzle's seed must not
// be computable from the date: seed = HMAC-SHA256(PUZZLE_SALT, "<game>:<n>"), with the salt only in
// Cloudflare secrets and Joshua's .dev.vars (START-HERE, "Open source without leaking puzzles").
//
// HMAC rather than a fast non-crypto hash because it's a PRF: someone who brute-forces today's seed
// from the published puzzle learns nothing about tomorrow's. The 128-bit output seeds sfc32, whose
// state is too large to brute-force from one observed puzzle in the first place (mulberry32's 32 bits
// are not). DECISIONS 2026-10-05.

/** The public salt: local dev, the Lovable preview, CI, and anyone running a fork. */
export const DEV_SALT = "dev";

export function resolveSalt(salt: string | undefined): string {
  return salt ? salt : DEV_SALT;
}

export type Seed = readonly [number, number, number, number];

/** WebCrypto, so the same code runs in the Worker, in Node scripts and in tests. */
export async function seedFor(salt: string, game: string, puzzleNo: number): Promise<Seed> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${game}:${puzzleNo}`));
  const words = new DataView(mac);
  return [words.getUint32(0), words.getUint32(4), words.getUint32(8), words.getUint32(12)];
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [lo, hi], both ends included. */
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy; the input is left alone. */
  shuffle<T>(items: readonly T[]): T[];
}

/**
 * sfc32 (Chris Doty-Humphrey's Small Fast Counter, from PractRand). Changing this function, or the
 * order generators draw from it, changes every puzzle a salt produces, so seed.test.ts pins its output.
 */
export function sfc32(seed: Seed): Rng {
  let [a, b, c, d] = seed;

  function nextU32(): number {
    // `| 0` keeps every step in 32-bit integer arithmetic, `>>> 0` reads the result as unsigned.
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  }

  const next = () => nextU32() / 4_294_967_296;

  function int(lo: number, hi: number): number {
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
      throw new RangeError(`int(${lo}, ${hi}) needs integers with lo <= hi`);
    }
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  return {
    next,
    int,
    pick(items) {
      if (items.length === 0) throw new RangeError("pick() from an empty list");
      // The index is in range, but noUncheckedIndexedAccess can't know that.
      return items[int(0, items.length - 1)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
  };
}

/**
 * A seed from any string without WebCrypto: cyrb128 (bryc's 128-bit string hash). For seeds that need
 * to be repeatable, not secret, such as a player's replay; `crypto.subtle` is missing outside secure
 * contexts (a phone on the dev server over HTTP, step 6). Puzzle seeds stay on HMAC (`seedFor`).
 */
export function stringSeed(text: string): Seed {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  // `>>> 0` reads each 32-bit word as unsigned, the same range seedFor returns.
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export async function rngFor(salt: string, game: string, puzzleNo: number): Promise<Rng> {
  return sfc32(await seedFor(salt, game, puzzleNo));
}
