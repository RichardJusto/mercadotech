"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as sellerService from "@/services/seller.service";
import { ORDER_STATUS_FLOW } from "@/lib/constants/orders";
import type { SellerOrder } from "@/services/seller.service";
import type { OrderStatus } from "@/lib/constants/roles";

export function useSellerOrders(sellerId: string | null) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sellerId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    sellerService
      .listMyOrders(sellerId)
      .then(setOrders)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Única lógica de negocio que vive en un hook (excepción explícita de la
  // spec): la RLS acepta cualquier estado que no sea 'cancelado', sin
  // validar secuencia — acá se rechaza cualquier salto que no sea "un paso
  // adelante" en ORDER_STATUS_FLOW, con actualización optimista y rollback.
  async function move(orderId: string, toStatus: OrderStatus) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.status === "cancelado") {
      toast.error("Un pedido cancelado no se puede mover.");
      return;
    }

    const fromIndex = ORDER_STATUS_FLOW.indexOf(order.status);
    const toIndex = ORDER_STATUS_FLOW.indexOf(toStatus);
    if (fromIndex === -1 || toIndex !== fromIndex + 1) {
      toast.error("Solo puedes avanzar el pedido un paso a la vez.");
      return;
    }

    const previous = orders;
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: toStatus } : o)),
    );

    try {
      await sellerService.updateOrderStatus(orderId, toStatus);
    } catch (err) {
      setOrders(previous);
      toast.error((err as Error).message);
    }
  }

  const grouped: Record<OrderStatus, SellerOrder[]> = {
    pendiente: [],
    pagado: [],
    enviado: [],
    entregado: [],
    cancelado: [],
  };
  for (const order of orders) grouped[order.status].push(order);

  return { orders, grouped, loading, error, move, retry: load };
}
