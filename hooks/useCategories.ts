"use client";

import { useEffect, useState } from "react";
import { listCategories } from "@/services/category.service";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];

// Cache simple en memoria a nivel de módulo: las categorías cambian poco y
// varios componentes (Navbar, FiltersPanel) las necesitan a la vez, sin
// disparar una consulta por cada montaje.
let cache: Category[] | null = null;

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;

    let cancelled = false;
    setLoading(true);
    listCategories()
      .then((data) => {
        if (cancelled) return;
        cache = data;
        setCategories(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
