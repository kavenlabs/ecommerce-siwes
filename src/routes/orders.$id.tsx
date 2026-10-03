import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { getOrderDetail } from "~/lib/queries";
import { fetchRequireUserFn } from "~/lib/session-actions";
import { naira } from "~/lib/utils";

import { StatusBadge } from "./orders";

export const Route = createFileRoute("/orders/$id")({
  beforeLoad: async () => {
    const res = await fetchRequireUserFn();
    if ("error" in res) throw redirect({ to: "/login" });
  },
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const options = getOrderDetail(Number(id));
  const { data, isPending, isError } = useQuery(options);
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery(options);
  }, [queryClient, options]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !data || "error" in data) throw notFound();

  const { order, items } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Order #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-muted-foreground">
                {item.qty} x {item.name}
              </span>
              <span className="tabular-nums">{naira(item.price * item.qty)}</span>
            </div>
          ))}

          <Separator className="my-1" />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{naira(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {order.fulfilment === "delivery" ? "Delivery" : "Collection"}
            </span>
            <span className="tabular-nums">
              {order.delivery_fee === 0 ? "Free" : naira(order.delivery_fee)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{naira(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Phone: </span>
            {order.phone}
          </p>
          {order.address ? (
            <p>
              <span className="text-muted-foreground">Address: </span>
              {order.address}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Placed: </span>
            {new Date(order.created_at).toLocaleDateString("en-NG", {
              dateStyle: "medium",
            })}
          </p>
        </CardContent>
      </Card>

      {order.status === "pending" ? (
        <Card>
          <CardHeader>
            <CardTitle>Next step</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We are checking this order. You will get a call on {order.phone} with transfer details
            once it is confirmed.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
