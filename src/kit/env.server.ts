// Cloudflare bindings, as seen from TanStack Start server code.
//
// How they get here (verified 2026-10-04, see DECISIONS): nitro's cloudflare-module preset receives
// fetch(request, env, ctx) and attaches env to the Request itself as request.runtime.cloudflare.env
// (node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs, augmentReq). TanStack
// Start builds its H3Event from that same Request object (start-server-core request-response.js,
// `new H3Event(request)`), so getRequest() inside a server function carries the bindings.
// Under `vite dev` (Lovable's preview, local dev) nitro doesn't run, so there is no runtime at all.

// The slice of D1's API this code uses. @cloudflare/workers-types would give the full type, but a
// new dependency means a bun lockfile change (CLAUDE.md), not worth it for three methods.
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta: { changes: number } }>;
  all<T>(): Promise<{ results: T[] }>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
}

export type WorkerEnv = {
  DB?: D1Like;
  PUZZLE_SALT?: string;
};

type CloudflareRequest = Request & { runtime?: { cloudflare?: { env?: WorkerEnv } } };

/** The Worker's env, or undefined when not running on Cloudflare (vite dev, Lovable preview). */
export async function workerEnv(): Promise<WorkerEnv | undefined> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest() as CloudflareRequest;
  return request.runtime?.cloudflare?.env;
}
