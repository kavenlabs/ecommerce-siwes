import { db } from "../src/lib/db/client.ts";

/*
 * The schema is applied on every connection, so this is really just a way to
 * create the file and confirm it is reachable without starting the server.
 * Every statement in the schema is CREATE ... IF NOT EXISTS, so it is safe to
 * run repeatedly.
 */

db();

const tables = db()
  .prepare(
    `SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name`,
  )
  .all() as { name: string }[];

console.log(`Database ready. Tables: ${tables.map((t) => t.name).join(", ")}`);
