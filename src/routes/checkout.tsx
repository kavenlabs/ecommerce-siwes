import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { placeOrderFn, DELIVERY_FEE } from "~/lib/checkout-api";
import { useCart } from "~/lib/cart";
import { fetchRequireUserFn } from "~/lib/session-actions";
import { naira } from "~/lib/utils";

export const Route = createFileRoute("/checkout")({
  beforeLoad: async () => {
    const res = await fetchRequireUserFn();
    if ("error" in res) throw redirect({ to: "/login" });
  },
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const deliveryFee = fulfilment === "delivery" ? DELIVERY_FEE : 0;
  const total = cart.subtotal + deliveryFee;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await placeOrderFn({
      data: {
        fulfilment,
        phone: String(fd.get("phone") ?? ""),
        address: String(fd.get("address") ?? ""),
        // Only ids and quantities are sent. The server owns pricing.
        items: cart.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      },
    });

    setPending(false);

    if ("error" in res) {
      setError(res.error ?? "Could not place the order.");
      return;
    }

    cart.clear();
    toast.success("Order placed", {
      description: "We will confirm it before you pay.",
    });

    await navigate({ to: "/orders/$id", params: { id: String(res.orderId) } });
  }

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">Nothing to check out</h1>
        <Button nativeButton={false} render={<a href="/shop" />} variant="outline" className="mt-4">
          Browse the shop
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Checkout</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>How would you like it?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Select
              value={fulfilment}
              onValueChange={(v) => setFulfilment(v as "delivery" | "pickup")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">
                  Deliver to my address ({naira(DELIVERY_FEE)})
                </SelectItem>
                <SelectItem value="pickup">Collect from the shop (free)</SelectItem>
              </SelectContent>
            </Select>

            {fulfilment === "delivery" ? (
              <div className="grid gap-2">
                <Label htmlFor="address">Delivery address</Label>
                <Input id="address" name="address" required autoComplete="street-address" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Collect from the shop. We will share the address once the order is confirmed.
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                required
                autoComplete="tel"
                placeholder="0803 000 0000"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {cart.lines.map((l) => (
              <div key={l.productId} className="flex justify-between">
                <span className="text-muted-foreground">
                  {l.qty} x {l.name}
                </span>
                <span className="tabular-nums">{naira(l.price * l.qty)}</span>
              </div>
            ))}

            <div className="mt-2 flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">
                {fulfilment === "delivery" ? "Delivery" : "Collection"}
              </span>
              <span className="tabular-nums">
                {deliveryFee === 0 ? "Free" : naira(deliveryFee)}
              </span>
            </div>

            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{naira(total)}</span>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Placing order" : "Place order"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/cart" })}>
            Back to cart
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          No card is charged here. We confirm the order, then send transfer details.
        </p>
      </form>
    </div>
  );
}
