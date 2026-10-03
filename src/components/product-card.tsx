import { Link } from "@tanstack/react-router";

import { Badge } from "~/components/ui/badge";
import type { Product } from "~/lib/types";
import { cn, naira } from "~/lib/utils";

/*
 * Card carries no shadow. The border does the separating.
 * The whole card is one link target.
 */
export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;

  return (
    <Link
      to="/products/$id"
      params={{ id: String(product.id) }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card",
        "transition-colors hover:border-ring",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product.image_path ? (
          <img
            src={product.image_path}
            alt={product.name}
            className="size-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-foreground">
            No image
          </div>
        )}

        {soldOut ? (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary">Sold out</Badge>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <p className="mt-auto text-sm font-semibold">{naira(product.price)}</p>
        {!soldOut ? (
          <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
        ) : null}
      </div>
    </Link>
  );
}
