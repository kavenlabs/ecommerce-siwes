import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { one, run } from "./db/client";

const SESSION_DAYS = 30;
export const COOKIE_NAME = "store_session";

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  // A corrupt or truncated row must fail closed, so fix the key length rather
  // than deriving it from the stored value.
  const KEYLEN = 64;
  if (!/^[0-9a-f]+$/i.test(hash) || hash.length !== KEYLEN * 2) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, KEYLEN);

  // timingSafeEqual throws if the buffers differ in length.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createUser(email: string, name: string, password: string, isAdmin = false): number {
  const result = run(
    "INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, ?)",
    email.toLowerCase().trim(),
    name.trim(),
    hashPassword(password),
    isAdmin ? 1 : 0,
  );
  return Number(result.lastInsertRowid);
}

export function startSession(userId: number): {
  token: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  run(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
    token,
    userId,
    expiresAt.toISOString(),
  );

  return { token, expiresAt };
}

export function destroySession(token: string): void {
  run("DELETE FROM sessions WHERE token = ?", token);
}

/*
 * Expiry is enforced on every read, but a token that is never presented again
 * would leave its row behind forever. A cheap probabilistic sweep amortises to
 * nothing and needs no cron job.
 */
let readsSinceSweep = 0;

function maybeSweepSessions(): void {
  if (++readsSinceSweep < 100) return;
  readsSinceSweep = 0;
  run("DELETE FROM sessions WHERE expires_at < ?", new Date().toISOString());
}

export function userForToken(token: string): User | null {
  maybeSweepSessions();

  const row = one<User & { expires_at: string }>(
    `SELECT u.id, u.email, u.name, u.is_admin, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    token,
  );

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, is_admin: row.is_admin };
}

export function findUserByEmail(email: string): User | null {
  const row = one<User>(
    "SELECT id, email, name, is_admin FROM users WHERE email = ?",
    email.toLowerCase().trim(),
  );
  return row ?? null;
}
