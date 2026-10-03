/*
 * The schema lives in TypeScript rather than a .sql file so it is always
 * available wherever the server bundle runs. Reading it with fs at runtime
 * broke in production: the file is not emitted into dist/.
 */

export const SCHEMA = `-- Schema for the store. Applied by scripts/migrate.ts.
-- Money is stored in whole naira as INTEGER, never as float.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  image_path  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  -- 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  status        TEXT    NOT NULL DEFAULT 'pending',
  -- 'delivery' | 'pickup'
  fulfilment    TEXT    NOT NULL,
  address       TEXT,
  phone         TEXT    NOT NULL,
  subtotal      INTEGER NOT NULL,
  delivery_fee  INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  -- Name and price are copied at purchase time so history stays correct
  -- if the product is later renamed or repriced.
  name       TEXT    NOT NULL,
  price      INTEGER NOT NULL,
  qty        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;
