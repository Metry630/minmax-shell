// A random per-browser id: how the server enforces one submission a day without accounts, and the
// PostHog distinct id. Streaks and stats live beside it, in stats.ts.

const KEY = "minmax:anon";

/**
 * A v4 UUID. `crypto.randomUUID` exists only in secure contexts (HTTPS, localhost) and on newer
 * browsers: a phone opening the dev server at a LAN IP over HTTP had none (step 6). getRandomValues
 * works everywhere, so it builds the same format, which the API's z.string().uuid() accepts.
 */
export function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Version 4 in the high nibble of byte 6, the RFC 4122 variant (10xx) in byte 8.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function anonId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = newUuid();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode, some in-app browsers): a fresh id per page load, so the
    // one-a-day rule can't hold for this player. Accepted rather than fingerprinting them.
    return newUuid();
  }
}
