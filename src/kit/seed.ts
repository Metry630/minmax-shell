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

export async function rngFor(salt: string, game: string, puzzleNo: number): Promise<Rng> {
  return sfc32(await seedFor(salt, game, puzzleNo));
}
