import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { deleteProductFn, saveProductFn } from "~/lib/admin-api";
import type { Product } from "~/lib/types";
import { STATUSES, updateOrderStatusFn } from "~/lib/store-actions";
import { getAdminData } from "~/lib/queries";
import { fetchRequireAdminFn } from "~/lib/session-actions";
import { naira } from "~/lib/utils";

import { StatusBadge } from "./orders";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const res = await fetchRequireAdminFn();
    if ("error" in res) throw redirect({ to: "/" });
  },
  component: AdminPage,
});

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // The file input is always present, so the id and existing image
    // ride along as plain fields.
    if (product) fd.set("id", String(product.id));
    fd.set("currentImage", product?.image_path ?? "");

    const res = await saveProductFn({ data: fd });

    setPending(false);

    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }

    toast.success(product ? "Product updated" : "Product added");
    form.reset();
    await router.invalidate();
    onDone();
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm(`Delete ${product.name}?`)) return;

    const res = await deleteProductFn({ data: { id: product.id } });
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Product deleted");
    await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await router.invalidate();
    onDone();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? `Edit ${product.name}` : "Add a product"}</CardTitle>
        <CardDescription>Price in whole naira. Image is optional, under 4MB.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={product?.name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={product?.description}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={product?.price}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={product?.stock ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image">Image</Label>
            <Input id="image" name="image" type="file" accept="image/*" />
            {product?.image_path ? (
              <p className="text-xs text-muted-foreground">
                Current image is kept unless you choose a new one.
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : product ? "Save changes" : "Add product"}
            </Button>
            {product ? (
              <Button type="button" variant="outline" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AdminPage() {
  const { data, isPending } = useQuery(getAdminData);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery(getAdminData);
  }, [queryClient]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function changeStatus(id: number, status: string) {
    const res = await updateOrderStatusFn({ data: { id, status } });
    if ("error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Order updated");
    await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    await queryClient.invalidateQueries({ queryKey: ["user-orders"] });
    await router.invalidate();
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  const products = data?.products ?? [];
  const orders = data?.orders ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          {products.length} products, {orders.length} orders
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Products</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm((s) => !s);
            }}
          >
            {showForm ? "Close" : "Add product"}
          </Button>
        </div>

        {showForm || editing ? (
          <ProductForm
            product={editing ?? undefined}
            onDone={() => {
              setEditing(null);
              setShowForm(false);
            }}
          />
        ) : null}

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {naira(p.price)} - {p.stock} in stock
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Orders</h2>

        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.phone} - {order.fulfilment === "delivery" ? "Delivery" : "Collection"}
                  </p>
                </div>

                <StatusBadge status={order.status} />

                <p className="text-sm font-semibold tabular-nums">{naira(order.total)}</p>

                <Select
                  value={order.status}
                  onValueChange={(v) => {
                    if (v) changeStatus(order.id, v);
                  }}
                >
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
