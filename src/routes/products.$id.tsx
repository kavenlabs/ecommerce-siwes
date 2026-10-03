import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/lib/cart";
import { Skeleton } from "~/components/ui/skeleton";
import { getProduct } from "~/lib/queries";
import { naira } from "~/lib/utils";

export const Route = createFileRoute("/products/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const productId = Number(id);
  const options = getProduct(productId);
  const { data, isPending, isError } = useQuery(options);
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery(options);
  }, [queryClient, options]);

  const cart = useCart();
  const [qty, setQty] = useState(1);

  if (isPending) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (isError) throw notFound();

  const product = data.product!;
  const soldOut = product.stock <= 0;

  function addToCart() {
    cart.add({ productId: product.id, name: product.name, price: product.price }, qty);
    toast.success("Added to cart", {
      description: `${qty} x ${product.name}`,
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-lg border border-border bg-card">
        {product.image_path ? (
          <img src={product.image_path} alt={product.name} className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-lg font-semibold">{naira(product.price)}</p>
        </div>

        {soldOut ? (
          <Badge variant="secondary">Sold out</Badge>
        ) : (
          <p className="text-sm text-muted-foreground">{product.stock} in stock</p>
        )}

        {product.description ? (
          <>
            <Separator />
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </>
        ) : null}

        <Separator />

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-border">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              -
            </Button>
            <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              disabled={qty >= product.stock}
              aria-label="Increase quantity"
            >
              +
            </Button>
          </div>

          <Button onClick={addToCart} disabled={soldOut} className="flex-1">
            {soldOut ? "Sold out" : "Add to cart"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Pay by transfer. We confirm the order before it ships.
        </p>
      </div>
    </div>
  );
}
