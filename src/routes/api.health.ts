import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY probe for step 1: which path to the Cloudflare bindings actually works once deployed.
// Deleted after the answer is recorded in DECISIONS.md.
type WithRuntime = { runtime?: { cloudflare?: { env?: Record<string, unknown> } } };

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getRequest } = await import("@tanstack/react-start/server");
        const viaGetRequest = (getRequest() as unknown as WithRuntime).runtime?.cloudflare?.env;
        const viaHandler = (request as unknown as WithRuntime).runtime?.cloudflare?.env;
        const viaGlobal = (globalThis as { __env__?: Record<string, unknown> }).__env__;
        let viaCloudflareWorkers: Record<string, unknown> | undefined;
        try {
          const specifier = "cloudflare:workers"; // a variable, so vite doesn't try to resolve it
          viaCloudflareWorkers = (await import(/* @vite-ignore */ specifier)).env;
        } catch {
          viaCloudflareWorkers = undefined;
        }
        const has = (env: Record<string, unknown> | undefined) => ({
          DB: Boolean(env?.["DB"]),
          PUZZLE_SALT: Boolean(env?.["PUZZLE_SALT"]),
        });
        return Response.json({
          sameRequestObject: getRequest() === request,
          getRequest: has(viaGetRequest),
          handlerRequest: has(viaHandler),
          globalEnv: has(viaGlobal),
          cloudflareWorkers: has(viaCloudflareWorkers),
        });
      },
    },
  },
});
