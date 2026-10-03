import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { getContext } from "./integrations/query-client";
import { routeTree } from "./routeTree.gen";

/*
 * Context is declared on the router and consumed via
 * createRootRouteWithContext in the root route, the acadacloud approach.
 *
 * The queryClient is not baked in here. A fixed instance would be shared by
 * every server request, so one visitor's cached session would be served to the
 * next. getContext() hands each request its own.
 */
export interface RouterContext {
  queryClient: QueryClient;
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: getContext(),
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
