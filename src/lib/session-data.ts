import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import { COOKIE_NAME, userForToken, type User } from "./auth-data";

/** Reads the signed-in user from the request cookie, or null when signed out. */
export function currentUser(): User | null {
  const token = getCookie(COOKIE_NAME);
  return token ? userForToken(token) : null;
}

export function setSessionCookie(token: string, expiresAt: Date): void {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    /*
     * Sent only over HTTPS in production. Left off in development so the app
     * works over plain http on localhost.
     */
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}
