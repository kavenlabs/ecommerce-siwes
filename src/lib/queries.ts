import { queryOptions } from "@tanstack/react-query";

import { fetchUserFn } from "~/lib/session-actions";
import {
  fetchAdminDataFn,
  fetchOrderDetailFn,
  fetchProductFn,
  fetchShopProductsFn,
  fetchUserOrdersFn,
} from "~/lib/store-actions";

/*
 * Query definitions, following the acadacloud pattern: a stable queryKey, and
 * a queryFn that calls the server function. Route loaders reach these through
 * queryClient.ensureQueryData, so the same data is served from cache on repeat
 * visits instead of refetching.
 */

export const getSession = queryOptions({
  queryKey: ["session"],
  queryFn: () => fetchUserFn(),
});

export const getProducts = queryOptions({
  queryKey: ["products"],
  queryFn: () => fetchShopProductsFn(),
});

export const getProduct = (id: number) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: () => fetchProductFn({ data: { id } }),
  });

export const getUserOrders = queryOptions({
  queryKey: ["user-orders"],
  queryFn: () => fetchUserOrdersFn(),
});

export const getOrderDetail = (id: number) =>
  queryOptions({
    queryKey: ["order", id],
    queryFn: () => fetchOrderDetailFn({ data: { id } }),
  });

export const getAdminData = queryOptions({
  queryKey: ["admin-data"],
  queryFn: () => fetchAdminDataFn(),
});
