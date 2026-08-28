"use client";

import { useCallback, useEffect, useState } from "react";
import { listMine } from "@/services/favorite.service";
import type { Product } from "@/types/product";

export function useFavorites() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listMine()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, retry: load };
}
