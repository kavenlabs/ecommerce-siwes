import { createServerFn } from "@tanstack/react-start";

import { currentUser } from "~/lib/session-data";
import type { PublicUser } from "~/lib/types";

function toPublic(user: ReturnType<typeof currentUser>): PublicUser | null {
  return user
    ? { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin }
    : null;
}

/*
 * Route components may not import *.server.* modules, so every read of the
 * session crosses this RPC boundary instead. Loaders and beforeLoad call
 * these; components never touch the database directly.
 */

export const fetchUserFn = createServerFn({ method: "GET" }).handler(async () => ({
  user: toPublic(currentUser()),
}));

export const fetchRequireUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = currentUser();
  return user ? { user: toPublic(user) } : { error: "Not signed in." as const };
});

export const fetchRequireAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = currentUser();
  if (!user) return { error: "Not signed in." as const };
  if (!user.is_admin) return { error: "Not allowed." as const };
  return { user: toPublic(user) };
});
