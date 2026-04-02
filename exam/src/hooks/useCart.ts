import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "../types";

const CART_KEY = "cart";

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );
  }, [cart]);

  function addToCart(item: Omit<CartItem, "qty">) {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) {
        return prev.map((x) =>
          x.id === item.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function changeQty(id: number, nextQty: number) {
    setCart((prev) => {
      if (nextQty <= 0) {
        return prev.filter((x) => x.id !== id);
      }
      return prev.map((x) => (x.id === id ? { ...x, qty: nextQty } : x));
    });
  }

  function clearCart() {
    setCart([]);
  }

  return {
    cart,
    total,
    addToCart,
    changeQty,
    clearCart,
  };
}