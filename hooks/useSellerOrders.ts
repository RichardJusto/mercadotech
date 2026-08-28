"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as sellerService from "@/services/seller.service";
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

  // La validación de "un paso adelante" vive en seller.service.ts
  // (updateOrderStatus) — el hook solo hace la actualización optimista y
  // revierte si el service rechaza la transición. Cero lógica de negocio
  // propia acá, como el resto de los hooks del proyecto.
  async function move(orderId: string, toStatus: OrderStatus) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

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
