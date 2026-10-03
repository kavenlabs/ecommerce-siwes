import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ProductCard } from "~/components/product-card";
import { Skeleton } from "~/components/ui/skeleton";
import { getProducts } from "~/lib/queries";

export const Route = createFileRoute("/shop")({
  /*
   * No loader. The page renders immediately and the list arrives from the
   * query cache, which the router prefetches on hover. A cold direct visit
   * shows skeletons instead of blocking navigation on the server.
   */
  component: Shop,
});

function Shop() {
  const { data, isPending } = useQuery(getProducts);
  const queryClient = useQueryClient();

  // Covers a direct visit, where nothing was hovered and so nothing prefetched.
  useEffect(() => {
    void queryClient.prefetchQuery(getProducts);
  }, [queryClient]);

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const products = data?.products ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Shop</h1>
        <p className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "item" : "items"} in stock
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nothing listed yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
