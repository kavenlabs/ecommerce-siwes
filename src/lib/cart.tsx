import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface CartLine {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

const KEY = "store_cart";

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartState | null>(null);

function read(): CartLine[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Until the stored cart has been read, writes must not happen. Otherwise the
  // save effect runs on mount with an empty array and wipes the real cart.
  const [ready, setReady] = useState(false);

  // Read after mount so server and client markup match on first paint.
  useEffect(() => {
    setLines(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const value = useMemo<CartState>(
    () => ({
      lines,
      add: (line, qty = 1) =>
        setLines((prev) => {
          const found = prev.find((l) => l.productId === line.productId);
          if (found) {
            return prev.map((l) =>
              l.productId === line.productId ? { ...l, qty: l.qty + qty } : l,
            );
          }
          return [...prev, { ...line, qty }];
        }),
      setQty: (productId, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.productId !== productId)
            : prev.map((l) => (l.productId === productId ? { ...l, qty } : l)),
        ),
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.price * l.qty, 0),
    }),
    [lines],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
