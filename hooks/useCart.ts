"use client";

import { useCallback, useEffect, useState } from "react";
import * as cartService from "@/services/cart.service";
import * as orderService from "@/services/order.service";
import type { CartItemWithProduct } from "@/services/cart.service";

export function useCart(userId: string | null) {
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    cartService
      .getItems(userId)
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(productId: string, quantity: number) {
    if (!userId) return;
    await cartService.addItem(userId, productId, quantity);
    load();
  }

  async function update(cartItemId: string, quantity: number) {
    await cartService.updateQuantity(cartItemId, quantity);
    load();
  }

  async function remove(cartItemId: string) {
    await cartService.removeItem(cartItemId);
    load();
  }

  // El stock pudo cambiar entre agregar al carrito y pagar (éxito o fallo
  // del RPC): siempre se recarga el carrito al terminar.
  async function checkout(): Promise<string> {
    if (!userId) throw new Error("No hay sesión activa");
    try {
      return await orderService.checkout(userId);
    } finally {
      load();
    }
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product ? item.product.price * item.quantity : 0),
    0,
  );
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, count, loading, error, add, update, remove, checkout, retry: load };
}
