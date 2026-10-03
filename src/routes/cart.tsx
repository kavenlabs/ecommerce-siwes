import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { useCart } from "~/lib/cart";
import { naira } from "~/lib/utils";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const cart = useCart();

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing here yet. Browse the shop to add something.
        </p>
        <Button nativeButton={false} render={<Link to="/shop" />} className="mt-4">
          Browse the shop
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Cart</h1>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {cart.lines.map((line) => (
          <li key={line.productId} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Link
                to="/products/$id"
                params={{ id: String(line.productId) }}
                className="text-sm font-medium hover:underline"
              >
                {line.name}
              </Link>
              <p className="text-sm text-muted-foreground">{naira(line.price)} each</p>
            </div>

            <div className="flex items-center rounded-md border border-border">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => cart.setQty(line.productId, line.qty - 1)}
                aria-label={`Decrease quantity of ${line.name}`}
              >
                -
              </Button>
              <span className="w-8 text-center text-sm tabular-nums">{line.qty}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => cart.setQty(line.productId, line.qty + 1)}
                aria-label={`Increase quantity of ${line.name}`}
              >
                +
              </Button>
            </div>

            <p className="w-24 text-right text-sm font-medium tabular-nums">
              {naira(line.price * line.qty)}
            </p>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => cart.remove(line.productId)}
              aria-label={`Remove ${line.name} from cart`}
            >
              x
            </Button>
          </li>
        ))}
      </ul>

      {/* Summary card is neutral. The only primary is the checkout button. */}
      <div className="ml-auto w-full max-w-sm rounded-lg border border-border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{naira(cart.subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Delivery is added at checkout.</p>

        <Button nativeButton={false} render={<Link to="/checkout" />} className="mt-4 w-full">
          Checkout
        </Button>
      </div>
    </div>
  );
}
