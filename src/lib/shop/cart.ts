import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "./types";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  pricePaise: number;
  image: string;
  category: Category;
  stock: number;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, qty = 1) => {
        const lines = get().lines;
        const found = lines.find((item) => item.productId === line.productId);
        const nextQty = Math.min(line.stock, (found?.qty ?? 0) + qty);
        if (nextQty < 1) return;
        if (found) {
          set({
            lines: lines.map((item) =>
              item.productId === line.productId ? { ...item, ...line, qty: nextQty } : item,
            ),
          });
          return;
        }
        set({ lines: [...lines, { ...line, qty: nextQty }] });
      },
      setQty: (productId, qty) => {
        set({
          lines: get().lines.flatMap((item) => {
            if (item.productId !== productId) return [item];
            const next = Math.max(0, Math.min(item.stock, Math.floor(qty)));
            return next < 1 ? [] : [{ ...item, qty: next }];
          }),
        });
      },
      remove: (productId) => set({ lines: get().lines.filter((item) => item.productId !== productId) }),
      clear: () => set({ lines: [] }),
    }),
    { name: "beyyond-cart" },
  ),
);

export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useCart.persist.hasHydrated());
    return useCart.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
