import type { Fulfilment, Order, OrderLine, OrderStatus } from "./types";
import { all, db, one, run } from "./db/client";

export type { Fulfilment, Order, OrderLine, OrderStatus };

export const DELIVERY_FEE = 2000;

/** Caps a single product line so a request cannot create unbounded rows. */
const MAX_QTY_PER_LINE = 50;

export function createOrder(input: {
  userId: number;
  fulfilment: Fulfilment;
  address: string | null;
  phone: string;
  items: { productId: number; qty: number }[];
}): number {
  /*
   * The client sends only product ids and quantities. Name and price are read
   * back from the database here, so a tampered request cannot change what is
   * charged. Totals are computed from those authoritative values.
   */
  db().exec("BEGIN");
  try {
    /*
     * Merge duplicate lines before anything else. A request can contain the
     * same product many times, and each line would otherwise be validated
     * against the same pre-decrement stock reading, overselling the item.
     */
    const wanted = new Map<number, number>();
    for (const item of input.items) {
      if (!Number.isInteger(item.qty) || item.qty < 1) {
        throw new Error("Quantity must be a whole number of at least 1.");
      }
      if (item.qty > MAX_QTY_PER_LINE) {
        throw new Error(`You can order at most ${MAX_QTY_PER_LINE} of one item.`);
      }
      wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.qty);
    }

    const lines: { productId: number; name: string; price: number; qty: number }[] = [];

    for (const [productId, qty] of wanted) {
      if (qty > MAX_QTY_PER_LINE) {
        throw new Error(`You can order at most ${MAX_QTY_PER_LINE} of one item.`);
      }

      const product = one<{ id: number; name: string; price: number; stock: number }>(
        "SELECT id, name, price, stock FROM products WHERE id = ?",
        productId,
      );
      if (!product) {
        throw new Error("One of the items is no longer available.");
      }
      if (product.stock < qty) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      lines.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        qty,
      });
    }

    const subtotal = lines.reduce((n, i) => n + i.price * i.qty, 0);
    const deliveryFee = input.fulfilment === "delivery" ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    const r = run(
      `INSERT INTO orders (user_id, status, fulfilment, address, phone, subtotal, delivery_fee, total)
       VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)`,
      input.userId,
      input.fulfilment,
      input.address,
      input.phone,
      subtotal,
      deliveryFee,
      total,
    );
    const orderId = Number(r.lastInsertRowid);

    for (const item of lines) {
      run(
        "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
        orderId,
        item.productId,
        item.name,
        item.price,
        item.qty,
      );

      /*
       * The stock >= qty guard makes negative stock impossible at the database
       * level, so a future path that skips validation still cannot oversell.
       */
      const res = run(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
        item.qty,
        item.productId,
        item.qty,
      );
      if (res.changes !== 1) {
        throw new Error(`Not enough stock for ${item.name}`);
      }
    }

    db().exec("COMMIT");
    return orderId;
  } catch (err) {
    db().exec("ROLLBACK");
    throw err;
  }
}

export function ordersForUser(userId: number): Order[] {
  return all<Order>("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", userId);
}

export function getOrder(id: number): Order | undefined {
  return one<Order>("SELECT * FROM orders WHERE id = ?", id);
}

export function itemsForOrder(orderId: number): OrderLine[] {
  return all<OrderLine>("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", orderId);
}

export function allOrders(): Order[] {
  return all<Order>("SELECT * FROM orders ORDER BY id DESC");
}

export function setOrderStatus(id: number, status: OrderStatus): void {
  run("UPDATE orders SET status = ? WHERE id = ?", status, id);
}
