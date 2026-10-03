import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createOrder, DELIVERY_FEE } from "~/lib/orders-data";
import { currentUser } from "~/lib/session-data";

/*
 * Types are erased at the RPC boundary, so the payload is validated for real.
 * Without this, a malformed body would reach the handler and be dereferenced.
 *
 * Only ids and quantities come from the browser. Names and prices are read
 * back from the database in createOrder, so a tampered request cannot change
 * what is charged.
 */
const lineSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(50),
});

const checkoutSchema = z.object({
  fulfilment: z.enum(["delivery", "pickup"]),
  address: z.string().trim().max(500).default(""),
  phone: z.string().trim().min(1).max(40),
  items: z.array(lineSchema).min(1).max(100),
});

export const placeOrderFn = createServerFn({ method: "POST" })
  .validator(checkoutSchema)
  .handler(async ({ data }) => {
    const user = currentUser();
    if (!user) return { error: "Sign in to place an order." as const };

    const address = data.address.trim();
    if (data.fulfilment === "delivery" && !address) {
      return { error: "Enter a delivery address." as const };
    }

    let orderId: number;
    try {
      orderId = createOrder({
        userId: user.id,
        fulfilment: data.fulfilment,
        address: data.fulfilment === "delivery" ? address : null,
        phone: data.phone,
        items: data.items,
      });
    } catch (err) {
      // Stock and quantity failures are raised inside the transaction.
      const message = err instanceof Error ? err.message : "Could not place the order.";
      return { error: message };
    }

    /*
     * Returned rather than thrown: a redirect raised inside a server function
     * is serialized to the client but not applied there, so the browser stayed
     * on /checkout. The caller navigates instead.
     */
    return { ok: true as const, orderId };
  });

export { DELIVERY_FEE };
