import { createServerOnlyFn } from "@tanstack/react-start";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { SCHEMA } from "./schema";

/*
 * DATA_DIR is an absolute path in production. It is resolved against the
 * process working directory rather than this module's location, because the
 * bundle's location moves between dev and dist and a relative path would put
 * the database somewhere different in each.
 */
const dataDir = resolve(process.env.DATA_DIR ?? "data");

let instance: DatabaseSync | null = null;

/**
 * Returns the process-wide connection, creating the file and applying the
 * schema on first call. Cached on globalThis so Vite's dev server module
 * reloads do not leak handles.
 */
export const db = createServerOnlyFn(function db(): DatabaseSync {
  if (instance) return instance;

  const g = globalThis as { __storeDb?: DatabaseSync };
  if (g.__storeDb) {
    instance = g.__storeDb;
    return instance;
  }

  mkdirSync(dataDir, { recursive: true });

  const conn = new DatabaseSync(resolve(dataDir, "store.db"));

  conn.exec("PRAGMA journal_mode = WAL");
  conn.exec("PRAGMA foreign_keys = ON");

  // Every statement is CREATE ... IF NOT EXISTS, so this is safe on each start.
  conn.exec(SCHEMA);

  g.__storeDb = conn;
  instance = conn;
  return conn;
});

export type Row = Record<string, unknown>;

export function one<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return db()
    .prepare(sql)
    .get(...(params as never[])) as T | undefined;
}

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return db()
    .prepare(sql)
    .all(...(params as never[])) as T[];
}

/** Returns the statement result, so callers can read lastInsertRowid. */
export function run(
  sql: string,
  ...params: unknown[]
): { changes: number; lastInsertRowid: number | bigint } {
  return db()
    .prepare(sql)
    .run(...(params as never[])) as {
    changes: number;
    lastInsertRowid: number | bigint;
  };
}
