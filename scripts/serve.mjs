/*
 * Serves the production build.
 *
 * `vite build` for TanStack Start emits a fetch handler rather than a
 * listening process, so `vite preview` only serves the static client assets
 * and every SSR route 500s. This mounts the built handler on a real port and
 * serves dist/client for asset requests, which the handler does not do itself.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import handler from "../dist/server/server.js";

/*
 * Guard against serving a build that does not match dist/. `vite build` writes a
 * fresh client manifest each time, but a long-running server keeps the SSR
 * handler it imported at start, so its HTML can reference hashed assets that
 * no longer exist. That produced a blank page with "error loading dynamically
 * imported module". Fail loudly at startup instead.
 */
const clientDirCheck = resolve(new URL("../dist/client", import.meta.url).pathname);
if (!existsSync(clientDirCheck)) {
  console.error("dist/client is missing. Run `npm run build` first.");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const clientDir = resolve(new URL("../dist/client", import.meta.url).pathname);

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/*
 * Product images live in public/uploads and are written at runtime, so they
 * cannot come from dist/client: that directory is a snapshot taken at build
 * time and does not contain anything uploaded afterwards. Serve uploads from
 * their real location first, and fall back to the build output.
 */
const uploadDir = resolve(new URL("../public/uploads", import.meta.url).pathname);

function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);

  if (decoded.startsWith("/uploads/")) {
    // normalize plus the prefix check keeps ../ out of the uploads directory.
    const target = normalize(join(uploadDir, decoded.slice("/uploads/".length)));
    if (target.startsWith(uploadDir)) return target;
    return null;
  }

  const target = normalize(join(clientDir, decoded));
  return target.startsWith(clientDir) ? target : null;
}

/** Serves a static file, or returns false if it is not there. */
function serveStatic(pathname, res) {
  const target = resolveFile(pathname);
  if (!target) return false;

  let stats;
  try {
    stats = statSync(target);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;

  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[extname(target)] ?? "application/octet-stream");
  res.setHeader("Content-Length", stats.size);
  res.setHeader(
    "Cache-Control",
    target.includes("/assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  );
  createReadStream(target).pipe(res);
  return true;
}

/** Collects the request body, since Request() needs it up front. */
function readBody(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolvePromise(Buffer.concat(chunks)));
    req.on("error", rejectPromise);
  });
}

const server = createServer(async (req, res) => {
  const url = `http://${req.headers.host ?? `localhost:${port}`}${req.url ?? "/"}`;
  const { pathname } = new URL(url);

  if ((req.method === "GET" || req.method === "HEAD") && serveStatic(pathname, res)) {
    return;
  }

  try {
    /*
     * The body has to be buffered and passed through. Server functions read it
     * with request.json(), and a GET-only Request arrives with no body at all,
     * which made every POST fail with "Unexpected end of JSON input".
     */
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? await readBody(req) : undefined;

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
      duplex: body ? "half" : undefined,
    });

    const response = await handler.fetch(request);

    res.statusCode = response.status;
    res.statusMessage = response.statusText;

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("request failed", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

/*
 * Checks that the assets this build references are the ones on disk. Catches
 * the stale-server case at startup instead of serving a page that 500s in the
 * browser.
 */
async function verifyAssetManifest() {
  try {
    const res = await handler.fetch(new Request(`http://localhost:${port}/`));
    const html = await res.text();
    const refs = [...html.matchAll(/\/(assets\/[A-Za-z0-9_.-]+\.(?:js|css))/g)].map((m) => m[1]);
    const missing = refs.filter((ref) => !existsSync(join(clientDir, ref)));

    if (missing.length > 0) {
      console.error("Build mismatch. These assets are referenced but missing on disk:");
      for (const ref of missing) console.error(`  ${ref}`);
      console.error("Restart the server after every build, or use `npm run deploy`.");
      process.exit(1);
    }
    console.log(`asset manifest ok (${refs.length} files referenced)`);
  } catch (err) {
    console.error("Could not verify the asset manifest:", err);
    process.exit(1);
  }
}

// A clear message beats an unhandled 'error' event stack trace.
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process, or set PORT.`);
    process.exit(1);
  }
  throw err;
});

server.listen(port, host, async () => {
  console.log(`store listening on http://${host}:${port}`);
  await verifyAssetManifest();
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
