"use client";

import { useEffect, useState } from "react";
import * as favoriteService from "@/services/favorite.service";

export function useFavorite(productId: string, userId: string | null) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsFavorite(false);
      return;
    }
    favoriteService
      .isFavorite(productId, userId)
      .then(setIsFavorite)
      .catch((err) => console.error("useFavorite: no se pudo leer el estado", (err as Error).message));
  }, [productId, userId]);

  async function toggle() {
    if (!userId) return;
    setLoading(true);
    try {
      const next = await favoriteService.toggle(productId, userId);
      setIsFavorite(next);
    } finally {
      setLoading(false);
    }
  }

  return { isFavorite, loading, toggle };
}
