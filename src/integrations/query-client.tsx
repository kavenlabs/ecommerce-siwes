import { QueryClient } from "@tanstack/react-query";

/*
 * One client in the browser, a fresh one per request on the server.
 *
 * A module-level singleton is wrong here. The server bundle is long-lived, so
 * a shared client would hold one visitor's session for the next request. It
 * also caches the SSR result, which is how a signed-in user ended up seeing
 * "Sign in" after a reload: the server rendered with its cached value and the
 * browser never refetched.
 */
const isServer = typeof document === "undefined";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 300_000,
        // Do not let a failed or retrying request hang a navigation open.
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

/**
 * The server must never hand the same instance to two requests, so it gets a
 * fresh client every time. The browser keeps one for the life of the tab.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeClient();

  browserClient ??= makeClient();
  return browserClient;
}

/**
 * The client the router context should carry. Called once per request on the
 * server and once per page load in the browser, so both sides agree.
 */
export function getContext() {
  return { queryClient: getQueryClient() };
}
