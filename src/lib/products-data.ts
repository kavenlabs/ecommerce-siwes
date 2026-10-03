import type { Product } from "./types";
import { all, one, run } from "./db/client";

export type { Product };

export function listProducts(): Product[] {
  return all<Product>(
    "SELECT id, name, description, price, stock, image_path FROM products ORDER BY id DESC",
  );
}

export function getProduct(id: number): Product | undefined {
  return one<Product>(
    "SELECT id, name, description, price, stock, image_path FROM products WHERE id = ?",
    id,
  );
}

export function createProduct(input: {
  name: string;
  description: string;
  price: number;
  stock: number;
  imagePath: string | null;
}): number {
  const r = run(
    "INSERT INTO products (name, description, price, stock, image_path) VALUES (?, ?, ?, ?, ?)",
    input.name,
    input.description,
    input.price,
    input.stock,
    input.imagePath,
  );
  return Number(r.lastInsertRowid);
}

export function updateProduct(
  id: number,
  input: {
    name: string;
    description: string;
    price: number;
    stock: number;
    imagePath: string | null;
  },
): void {
  run(
    "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_path = ? WHERE id = ?",
    input.name,
    input.description,
    input.price,
    input.stock,
    input.imagePath,
    id,
  );
}

export function deleteProduct(id: number): void {
  run("DELETE FROM products WHERE id = ?", id);
}
