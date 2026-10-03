import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import {
  COOKIE_NAME,
  createUser,
  destroySession,
  findUserByEmail,
  startSession,
  verifyPassword,
} from "~/lib/auth-data";
import { one } from "~/lib/db/client";
import { clearSessionCookie, setSessionCookie } from "~/lib/session-data";

const MIN_PASSWORD = 8;

export const loginFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const user = one<{ id: number; password_hash: string }>(
      "SELECT id, password_hash FROM users WHERE email = ?",
      data.email.toLowerCase().trim(),
    );

    // Same message either way, so this cannot be used to enumerate accounts.
    const invalid = { error: "Email or password is incorrect." as const };

    if (!user) return invalid;
    if (!verifyPassword(data.password, user.password_hash)) return invalid;

    const { token, expiresAt } = startSession(user.id);
    setSessionCookie(token, expiresAt);

    return { ok: true as const };
  });

export const registerFn = createServerFn({ method: "POST" })
  .validator((d: { name: string; email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.toLowerCase().trim();
    const password = data.password;

    if (!name) return { error: "Enter your name." as const };
    if (!email.includes("@")) return { error: "Enter a valid email." as const };
    if (password.length < MIN_PASSWORD) {
      return {
        error: `Password must be at least ${MIN_PASSWORD} characters.` as const,
      };
    }
    if (findUserByEmail(email)) {
      return { error: "An account with that email already exists." as const };
    }

    // The very first account becomes the admin, so a fresh install is usable.
    const count = one<{ n: number }>("SELECT COUNT(*) AS n FROM users");
    const userId = createUser(email, name, password, count?.n === 0);

    const { token, expiresAt } = startSession(userId);
    setSessionCookie(token, expiresAt);

    return { ok: true as const };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (token) destroySession(token);
  clearSessionCookie();
  return { ok: true as const };
});
