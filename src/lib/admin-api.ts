import { createServerFn } from "@tanstack/react-start";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createProduct, deleteProduct, updateProduct } from "~/lib/products-data";
import { currentUser } from "~/lib/session-data";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

/*
 * The declared Content-Type is only a hint from the client, so the leading
 * bytes are checked as well. WebP and AVIF share the RIFF container, so
 * WebP additionally checks for its "WEBP" form type at offset 8.
 */
type Format = { ext: string; matches: (b: Buffer) => boolean };

const ALLOWED: Format[] = [
  {
    ext: ".jpg",
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: ".png",
    matches: (b) =>
      b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: ".webp",
    matches: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    ext: ".avif",
    matches: (b) =>
      b.length > 12 &&
      b.subarray(4, 8).toString("ascii") === "ftyp" &&
      b.subarray(8, 12).toString("ascii").startsWith("avi"),
  },
];

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function requireAdmin() {
  const user = currentUser();
  if (!user || !user.is_admin) {
    return { error: "Not allowed." as const };
  }
  return { user };
}

async function saveImage(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image must be under 4MB.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const format = ALLOWED.find((f) => f.matches(bytes));
  if (!format) {
    throw new Error("That file is not a JPG, PNG, WebP, or AVIF image.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${format.ext}`;
  await writeFile(join(UPLOAD_DIR, name), bytes);

  return `/uploads/${name}`;
}

type Parsed = {
  name: string;
  description: string;
  price: number;
  stock: number;
};

function parseForm(fd: FormData): { error: string } | { value: Parsed } {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Enter a product name." };

  const price = Number(fd.get("price"));
  if (!Number.isInteger(price) || price < 0) {
    return { error: "Price must be a whole number in naira." };
  }

  const stock = Number(fd.get("stock"));
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "Stock must be a whole number." };
  }

  return {
    value: {
      name,
      description: String(fd.get("description") ?? "").trim(),
      price,
      stock,
    },
  };
}

/*
 * The validator takes FormData, which the framework passes through untouched
 * for POST. That is how the file survives the trip to the server.
 */
export const saveProductFn = createServerFn({ method: "POST" })
  .validator((d: FormData) => d)
  .handler(async ({ data }) => {
    const guard = requireAdmin();
    if ("error" in guard) return guard;

    const parsed = parseForm(data);
    if ("error" in parsed) return parsed;

    const idRaw = String(data.get("id") ?? "");
    const id = idRaw ? Number(idRaw) : undefined;
    if (idRaw && !Number.isInteger(id)) {
      return { error: "Unknown product." };
    }

    let imagePath = String(data.get("currentImage") ?? "") || null;
    try {
      const uploaded = await saveImage(data.get("image"));
      if (uploaded) imagePath = uploaded;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Upload failed." };
    }

    if (id) {
      updateProduct(id, { ...parsed.value, imagePath });
      return { ok: true as const, id };
    }

    const newId = createProduct({ ...parsed.value, imagePath });
    return { ok: true as const, id: newId };
  });

export const deleteProductFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const guard = requireAdmin();
    if ("error" in guard) return guard;

    try {
      deleteProduct(data.id);
    } catch (err) {
      /*
       * order_items references products, so SQLite refuses to delete anything
       * that appears in a past order. Retiring the item is the right move, and
       * saying so beats an unhandled 500.
       */
      if (err instanceof Error && err.message.includes("FOREIGN KEY")) {
        return {
          error:
            "This product appears in past orders and cannot be deleted. Set its stock to 0 to retire it." as const,
        };
      }
      throw err;
    }

    return { ok: true as const };
  });
