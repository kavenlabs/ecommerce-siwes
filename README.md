# Adetunji Electronics

A single-store ecommerce site for cables, chargers, and accessories.

Built with TanStack Start, `node:sqlite`, and shadcn/ui on Base UI.

## What it does

- Browse products, add to cart, check out with delivery or collection
- Pay by bank transfer, confirmed by hand in the admin panel
- Customer accounts with order history
- Admin panel for products, images, stock, and order status

## Requirements

- Node 22.5 or newer (Node 26 recommended). `node:sqlite` is stable from Node 22.5,
  so no experimental flag is needed.
- A filesystem you control. This is built for a single VPS or home server, not
  serverless, because the database is a local file.

## Setup

```bash
npm install
npm run db:seed     # creates data/store.db, 6 sample products, one admin account
npm run dev         # http://localhost:3000
```

The seed creates one admin, `admin@adetunji.shop`, with the password
`changeme123`. **Change it before you go live**, or anyone who has read this
file can sign in as the shop owner:

```bash
npm run user:password -- admin@adetunji.shop 'a-long-unique-password'
```

That also signs out every existing session for the account, so a stolen cookie
cannot outlive the change.

To seed a different admin instead, set the environment before the first run:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='something-long' npm run db:seed
```

The first account created on a fresh database becomes the admin automatically,
so on an empty database you can skip seeding and just register through the UI.

## Signing in

One login form serves both roles, at `/login`. It has two tabs, Sign in and
Create account, and they post to the same endpoint.

- **Customers** register themselves and land on `/orders` to see their history.
  They cannot reach `/admin`; the server rejects it, not just the UI.
- **The shop owner** is the account with `is_admin` set. The account button in
  the header then has an Admin entry, and `/admin` is reachable.

There is no separate admin login. The distinction is the `is_admin` column on
the user, checked server side on every admin action, so hiding the link in the
header is presentation only and not the control.

## Commands

| Command                   | What it does                                         |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Dev server on port 3000                              |
| `npm run build`           | Production build (`vite build` only, no nitro)       |
| `npm run serve`           | Serve the production build (PORT, default 3000)      |
| `npm run typecheck`       | `tsc --noEmit`                                       |
| `npm run lint`            | oxlint                                               |
| `npm run format`          | oxfmt (writes)                                       |
| `npm run format:check`    | oxfmt (check only)                                   |
| `npm run verify`          | typecheck, lint, format check, and build in sequence |
| `npm run generate-routes` | Regenerate the route tree after adding a route       |
| `npm run db:seed`         | Seed products and the first admin                    |

## How it is put together

```
src/
  routes/            file-based routes; the only place URLs are defined
  components/        app-shell, product-card, and shadcn/ui primitives
  lib/
    db/              node:sqlite connection and schema.sql
    *-data.ts        database reads and writes
    *-api.ts         createServerFn definitions
    *-actions.ts     cross-cutting server functions
  styles.css         design tokens
```

### Why some files are named the way they are

TanStack Start refuses to bundle `*.server.*` modules into the client, and the
check is transitive. That produced a strict layering:

- **`*-data.ts`** touches the database and `node:sqlite`. Never imported by a
  component.
- **`*-api.ts`** and **`*-actions.ts`** wrap those calls in `createServerFn`, so
  the server code is stripped from the client bundle and the component only ever
  sees an RPC stub.
- **`lib/db/client.ts`** wraps the connection in `createServerOnlyFn`, so an
  accidental client import throws at runtime instead of quietly bundling SQLite.

Shared types live in `lib/types.ts` so client components can import them without
crossing a server boundary.

### Money

Stored as whole naira in an `INTEGER` column, never a float. `naira()` in
`lib/utils.ts` is the only place a price becomes a string.

### Stock and pricing

The browser sends only product ids and quantities. Names, prices, and totals are
computed server-side from the database, so a tampered request cannot change what
is charged.

Stock is decremented inside a transaction. Duplicate lines for the same product
are merged before validation, because validating each line separately would let
several lines each pass a check against the same pre-decrement stock reading and
oversell the item. The `UPDATE` also carries `AND stock >= ?`, so negative stock
is impossible even if a future code path skips validation.

### Validation

Server functions validate with zod, because TypeScript types are erased at the
RPC boundary. A malformed body is rejected before it reaches any database call.

### Images

Uploaded to `public/uploads`, restricted to JPG, PNG, WebP, and AVIF under 4MB.

Uploads are served from `public/uploads` directly, **not** from `dist/client`.
Vite copies `public/` into the build output at build time, so anything uploaded
after a build would be missing and every product image would 404. `serve.mjs`
resolves `/uploads/*` against the real directory and everything else against
`dist/client`. This means a new upload is live immediately, with no rebuild.

Product images use `object-contain`, not `object-cover`, so a portrait photo is
shown whole instead of being cropped to a square.
The file extension comes from a fixed allowlist, never from the uploaded name,
and the leading bytes are checked against that allowlist, so a mislabelled or
polyglot file is rejected. Serving from `public/` is fine for a single server. If
you later put a CDN in front, move these to object storage.

### Caching and why there are no route loaders

**Do not add a `loader` to a data route.** A loader blocks the navigation until
the server responds. Over a network that is one or two seconds of a frozen page,
which is what this app had before. Route loaders are fine only for access
control, which is why the root route still has one.

Instead, every data route uses `useQuery` in the component and renders a
skeleton while loading, following acadacloud. The router prefetches on hover
(`defaultPreload: "intent"`), so by the time the user clicks, the data is
usually already in the cache. Navigation then paints the new page immediately.

Measured at 250ms round-trip latency: URL changes in 48-99ms and content is on
screen in 62-105ms, where it previously waited on a server round trip.

The signed-in user is fetched once in the root route's `beforeLoad` via
`queryClient.ensureQueryData(getSession)`, then handed to every page as router
context. `beforeLoad` return values must be serializable, so only the user comes
back from it; the queryClient reaches loaders through route context.

**Never export a `queryClient` singleton.** `src/integrations/query-client.tsx`
exposes `getQueryClient()` instead, which returns a fresh client on the server
and one per tab in the browser. A module-level client is shared by every server
request, so one visitor's cached session can be served to the next, and the
browser receives a cache it never populated, leaving a signed-in user looking at
a signed-out header after every reload.

`src/lib/queries.ts` holds the query definitions. After any mutation, invalidate
the affected query keys or the UI keeps showing stale data. Anything that changes
the current identity must purge the cache entirely, or a previous customer's data
stays readable until it expires:

- `signOut` in `app-shell.tsx` calls `queryClient.removeQueries()`.
- The login route does the same after a successful sign in or registration.

`npm run deploy` builds and then serves, because the server imports the built
SSR handler once at startup. Restarting without rebuilding, or rebuilding
without restarting, leaves the running server pointing at hashed asset names
that no longer exist. `serve.mjs` verifies the manifest at startup and refuses
to start on a mismatch.

### Hydration

Theme is read in an effect, never during render. Reading `localStorage` in a
`useState` initializer makes the first client render disagree with the server,
which has no storage, and React fails hydration on the theme toggle. The inline
script in the document head sets the `dark` class before first paint, so there is
no flash of the wrong theme.

## Design rules

These are enforced by convention and are easy to break by accident:

1. **Colours are semantic tokens at full strength.** In code you write, no `/NN`
   opacity modifiers on theme colours, no arbitrary hex or `rgb()` in a class, no
   inline colour styles. The files in `src/components/ui` are generated by the
   shadcn CLI and ship as the CLI wrote them.
2. **`bg-primary` appears only on** the primary button, an active nav or tab
   item, and the focus ring. Never on a card, badge, or as a surface tint.
3. **No em dashes in visible UI text.** Hyphens are fine for ranges.
4. **Cards carry no shadow.** Separation is the border's job. One neutral shadow
   is reserved for overlays.
5. **Status colours use existing tokens only:** `bg-primary` for in progress,
   `bg-destructive` for cancelled, `bg-secondary` for the rest. The preset is the
   single source of truth, and no tokens were added to it.

Imports use the `~/` alias, which resolves to `src/`.

## Reaching it over the internet

For testing from a phone or another network, a quick Cloudflare tunnel needs no
account and no domain. It gives a random `trycloudflare.com` address that
changes on every restart.

```bash
PORT=3002 npm run serve                                  # terminal 1
cloudflared tunnel --url http://localhost:3002           # terminal 2
```

The public address is printed in the tunnel log:

```bash
grep trycloudflare /tmp/cloudflared.log
```

Then check the whole path actually works from outside, not just that the page
loads:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<address>.trycloudflare.com/
```

A quick tunnel has no uptime guarantee and is subject to Cloudflare's terms, so
it is for testing only. For a real shop, create a named tunnel on a domain you
own, which needs you to be signed into Cloudflare and add a DNS record.

`PORT` defaults to 3000. Everything else is unchanged, so the app works the
same on any port.

## Deploying

Built for one machine with a persistent disk.

1. `npm ci && npm run build`
2. Run `npm run serve` under a process manager (pm2, systemd) behind a reverse
   proxy. Set `PORT` and `HOST` as needed.

`npm run serve` exists because `vite build` for TanStack Start emits a fetch
handler rather than a listening process, and `vite preview` does not run it, so
every SSR route 500s. `scripts/serve.mjs` mounts the built handler and serves
`dist/client` for assets, buffering request bodies so server-function POSTs
work. `DATA_DIR` is resolved against the working directory, so run it from the
project root or set an absolute path. 3. Put the SQLite file on the persistent disk. `data/` holds it, and
`DATA_DIR` overrides the location. 4. Terminate TLS at the proxy. The session cookie is `httpOnly` and `sameSite=lax`,
but it is not marked `secure`, so serve over HTTPS in production and add
`secure: true` in `lib/session-data.ts` if you terminate TLS upstream.

Back up by copying `data/store.db`. Nothing else is stateful.

## Not built

Deliberately out of scope: card payments, search, coupons, reviews, multiple
shops, and shipping-provider integration. Payment is a manual transfer
confirmation, and the panel tells the customer to expect a call.
