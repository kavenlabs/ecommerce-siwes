import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { fetchRequireUserFn } from "~/lib/session-actions";
import { Skeleton } from "~/components/ui/skeleton";
import { getUserOrders } from "~/lib/queries";
import type { OrderStatus } from "~/lib/types";
import { naira } from "~/lib/utils";

/*
 * Status colours, using only tokens the preset already has.
 * No new tokens, no opacity modifiers.
 */
export function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === "delivered") {
    return <Badge variant="secondary">Delivered</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="bg-destructive text-destructive-foreground">Cancelled</Badge>;
  }
  if (status === "confirmed") {
    return <Badge className="bg-primary text-primary-foreground">Confirmed</Badge>;
  }
  return <Badge variant="secondary">Awaiting payment</Badge>;
}

export const Route = createFileRoute("/orders")({
  beforeLoad: async () => {
    const res = await fetchRequireUserFn();
    if ("error" in res) throw redirect({ to: "/login" });
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isPending } = useQuery(getUserOrders);
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery(getUserOrders);
  }, [queryClient]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const orders = data?.orders ?? [];

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">No orders yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          When you place an order it will show up here.
        </p>
        <Button nativeButton={false} render={<Link to="/shop" />} className="mt-4">
          Browse the shop
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Your orders</h1>

      <ul className="flex flex-col gap-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              to="/orders/$id"
              params={{ id: String(order.id) }}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Order #{order.id}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-NG", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>

              <StatusBadge status={order.status} />

              <p className="text-sm font-semibold tabular-nums">{naira(order.total)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
