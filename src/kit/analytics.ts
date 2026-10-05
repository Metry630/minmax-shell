import { anonId } from "./anon";

// PostHog for retention cohorts. The key is PostHog's public client key, read from .env.local at
// build time; with no key (Lovable preview, forks of the public repo) every call is a no-op, so
// nobody else's builds send events to this project.
const KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

type PostHog = (typeof import("posthog-js"))["default"];
let client: Promise<PostHog> | undefined;

/** The lazily loaded client; undefined during SSR and when there's no key. */
export function posthogClient(): Promise<PostHog> | undefined {
  if (typeof window === "undefined" || !KEY) return undefined;
  // Loaded on first event rather than at page load, and never during SSR.
  client ??= import("posthog-js").then(({ default: ph }) => {
    ph.init(KEY, {
      api_host: HOST,
      bootstrap: { distinctID: anonId() },
      persistence: "localStorage",
      autocapture: false,
      capture_pageview: false, // pageviews come from Cloudflare Web Analytics
      disable_session_recording: true,
      // The project's remote config turns these on by default; each one loads another script
      // (seen in step 1: surveys.js, dead-clicks-autocapture.js, web-vitals) for data we don't use.
      disable_surveys: true,
      disable_web_experiments: true,
      capture_dead_clicks: false,
      capture_performance: false,
    });
    return ph;
  });
  return client;
}

// Every event the kit sends, with its properties. The distinct id is the anon id (bootstrapped
// above), so retention cohorts follow one browser across days.
export type Events = {
  puzzle_viewed: { game: string; n: number };
  puzzle_started: { game: string; n: number };
  /** Accepted submissions only; `ms` is from puzzle_started, null if the player never started. */
  puzzle_submitted: { game: string; n: number; score: number; optimum: number; ms: number | null };
  share_clicked: { game: string; n: number };
};

export function track<E extends keyof Events>(event: E, properties: Events[E]): void {
  void posthogClient()?.then((ph) => ph.capture(event, properties));
}
