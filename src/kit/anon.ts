// A random per-browser id: how the server enforces one submission a day without accounts, and the
// PostHog distinct id. Minimal for step 1; step 2 builds stats and streaks on top of it.

const KEY = "minmax:anon";

export function anonId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode, some in-app browsers): a fresh id per page load, so the
    // one-a-day rule can't hold for this player. Accepted rather than fingerprinting them.
    return crypto.randomUUID();
  }
}
