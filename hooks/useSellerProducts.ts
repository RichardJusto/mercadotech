"use client";

import { useCallback, useEffect, useState } from "react";
import * as sellerService from "@/services/seller.service";
import { triggerReindex } from "@/services/indexing-trigger.service";
import type { Product } from "@/types/product";

export function useSellerProducts(sellerId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sellerId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    sellerService
      .listMyProducts(sellerId)
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(productId: string, isActive: boolean) {
    await sellerService.toggleActive(productId, isActive);
    triggerReindex("producto", productId);
    load();
  }

  async function remove(productId: string) {
    await sellerService.deleteProduct(productId);
    // El producto ya no existe: embedding.service detecta la ausencia y
    // limpia la ficha huérfana en vez de intentar reindexar contenido.
    triggerReindex("producto", productId);
    load();
  }

  return { products, loading, error, toggleActive, remove, retry: load };
}
