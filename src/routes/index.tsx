import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowRight, Package, ShieldCheck, Truck } from "lucide-react";

import { ProductCard } from "~/components/product-card";
import { Button } from "~/components/ui/button";
import { getProducts } from "~/lib/queries";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data } = useQuery(getProducts);
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery(getProducts);
  }, [queryClient]);

  const products = (data?.products ?? []).slice(0, 6);

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-lg border border-border bg-card p-6 md:p-10">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Cables, chargers, and accessories
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Order online and pay by transfer. We confirm every order before it ships, and you can
          collect from the shop if you prefer.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link to="/shop" />}>
            Browse the shop
            <ArrowRight />
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link to="/orders" />}>
            Track an order
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Confirmed by hand",
            body: "A person checks every order before payment is requested.",
          },
          {
            icon: Truck,
            title: "Delivered or collected",
            body: "Choose delivery to your address, or pick up from the shop.",
          },
          {
            icon: Package,
            title: "Stock you can trust",
            body: "Counts come straight from the shelf, not a guess.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border border-border bg-card p-4">
            <Icon className="size-5" />
            <h2 className="mt-3 text-sm font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      {products.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New arrivals</h2>
            <Button nativeButton={false} variant="ghost" size="sm" render={<Link to="/shop" />}>
              See all
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
