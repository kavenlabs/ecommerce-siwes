import { createServerFn } from "@tanstack/react-start";

import {
  getOrder,
  itemsForOrder,
  ordersForUser,
  allOrders,
  setOrderStatus,
  type OrderStatus,
} from "~/lib/orders-data";
import { currentUser } from "~/lib/session-data";
import { listProducts } from "~/lib/products-data";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "delivered", "cancelled"];

export { STATUSES };

export const fetchUserOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = currentUser();
  if (!user) return { error: "Not signed in." as const };
  return { orders: ordersForUser(user.id) };
});

export const fetchOrderDetailFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const user = currentUser();
    if (!user) return { error: "Not signed in." as const };

    const order = getOrder(data.id);
    // Ownership is checked here, so one customer cannot read another's order.
    if (!order || order.user_id !== user.id) return { error: "Not found." as const };

    return { order, items: itemsForOrder(order.id) };
  });

export const fetchShopProductsFn = createServerFn({ method: "GET" }).handler(async () => ({
  products: listProducts(),
}));

export const fetchProductFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const product = listProducts().find((p) => p.id === data.id);
    return product ? { product } : { error: "Not found." as const };
  });

export const fetchAdminDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const user = currentUser();
  if (!user || !user.is_admin) return { error: "Not allowed." as const };
  return { products: listProducts(), orders: allOrders() };
});

export const updateOrderStatusFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; status: string }) => d)
  .handler(async ({ data }) => {
    const user = currentUser();
    if (!user || !user.is_admin) return { error: "Not allowed." as const };

    if (!STATUSES.includes(data.status as OrderStatus)) {
      return { error: "Unknown status." as const };
    }

    setOrderStatus(data.id, data.status as OrderStatus);
    return { ok: true as const };
  });
