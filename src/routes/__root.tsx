import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";

import { AppShell } from "~/components/app-shell";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/sonner";
import type { PublicUser } from "~/lib/types";
import { getSession } from "~/lib/queries";
import type { RouterContext } from "~/router";
import { CartProvider, useCart } from "~/lib/cart";
import { ThemeProvider } from "~/lib/theme";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Adetunji Electronics" },
      {
        name: "description",
        content: "Cables, chargers, and accessories. Delivered or collected.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    /*
     * Applies the stored theme before first paint, so a dark-mode user never
     * sees a white flash. Declared here rather than as a JSX <script> element,
     * which React would not execute during client render.
     */
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem('store_theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
      },
    ],
  }),
  /*
   * Fetched once here and handed to every page as router context, the
   * acadacloud pattern. ensureQueryData means the second and later navigations
   * read the cached session instead of calling the server again.
   */
  beforeLoad: async ({ context }) => {
    // The user is serializable; the queryClient itself reaches loaders through
    // route context, since beforeLoad results must survive serialization.
    const { user } = await context.queryClient.ensureQueryData(getSession);
    return { user };
  },
  loader: ({ context }) => ({ user: context.user }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayoutInner() {
  const { user, queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CartProvider>
          <Shell user={user} />
        </CartProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-1 text-lg font-semibold">We could not find that page</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The link may be old, or the item may have sold out and been removed.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button nativeButton={false} render={<Link to="/" />}>
          Back to home
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link to="/shop" />}>
          Browse the shop
        </Button>
      </div>
    </div>
  );
}

function RootLayout() {
  return <RootLayoutInner />;
}

/* Cart count lives in client state, so it needs its own subscriber. */
function Shell({ user }: { user: PublicUser | null }) {
  const { count } = useCart();
  return (
    <AppShell user={user} cartCount={count}>
      <Outlet />
    </AppShell>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
