import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Package,
  ShoppingBag,
  Sun,
  User as UserIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { logoutFn } from "~/lib/auth-api";
import type { PublicUser } from "~/lib/types";
import { useTheme } from "~/lib/theme";
import { cn } from "~/lib/utils";

const LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/shop", label: "Shop", icon: LayoutGrid },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
] as const;

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
        A
      </span>
      <span>Bolfos Ventures</span>
    </Link>
  );
}

function isActive(to: string, pathname: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

/*
 * Active items get bg-primary text-primary-foreground, one of the three
 * sanctioned uses of --primary. Inactive items stay on the neutral scale.
 */
function itemClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export function AppShell({
  user,
  cartCount,
  children,
}: {
  user: PublicUser | null;
  cartCount: number;
  children: React.ReactNode;
}) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await logoutFn();
    /*
     * Drop every cached query, not just the session. Leaving the old user in
     * the cache would keep the account menu on screen and could serve a
     * previous customer's data until it expired.
     */
    queryClient.removeQueries();
    await router.invalidate();
    await navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <Brand />

          {/* Navigation lives in the sidebar on desktop and the bottom bar on
              mobile, so the header carries only the brand and account controls. */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon" aria-label="Account" />}
                >
                  <UserIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {user.isAdmin ? (
                    <DropdownMenuItem render={<Link to="/admin" />}>Admin</DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button nativeButton={false} size="sm" render={<Link to="/login" />}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:py-8">
        {/* Sidebar on desktop. */}
        <aside className="hidden w-52 shrink-0 md:block">
          <nav aria-label="Primary" className="sticky top-20 flex flex-col gap-1">
            {LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={itemClass(isActive(to, pathname))}>
                <Icon className="size-4" />
                {label}
                {to === "/cart" && cartCount > 0 ? (
                  <Badge variant="secondary" className="ml-auto">
                    {cartCount}
                  </Badge>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav on mobile. */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
      >
        <div className="grid grid-cols-4">
          {LINKS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to, pathname);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  // The label sits below the filled icon box, not inside it,
                  // so it takes the normal foreground colour either way.
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md",
                    active && "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {label}
                {to === "/cart" && cartCount > 0 ? (
                  <span className="sr-only">{cartCount} items</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
