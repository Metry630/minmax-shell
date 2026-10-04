import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { hostRewrite } from "./kit/hosts";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // On a game's own domain, "/" renders that game (src/kit/hosts.ts).
    rewrite: hostRewrite,
  });

  return router;
};
