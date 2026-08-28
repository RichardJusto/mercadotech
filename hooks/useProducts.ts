"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listActiveProducts } from "@/services/product.service";
import type { Product } from "@/types/product";
import type { ProductCondition } from "@/lib/constants/roles";
import type { SortOption } from "@/lib/constants/catalog";

interface UseProductsOptions {
  // Fijados desde la ruta, no desde la URL de filtros: categorySlug viene de
  // /categoria/[slug] y search de ?q= en /buscar.
  categorySlug?: string;
  search?: string;
}

export interface ProductFilters {
  sort: SortOption;
  condition: ProductCondition[];
  minPrice?: number;
  maxPrice?: number;
}

export function useProducts({ categorySlug, search }: UseProductsOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const sort = (searchParams.get("sort") as SortOption) || "recientes";
  const condition = searchParams.getAll("condition") as ProductCondition[];
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minPrice = minPriceParam ? Number(minPriceParam) : undefined;
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined;

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conditionKey = condition.join(",");

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError(null);
    listActiveProducts({
      categorySlug,
      search,
      condition: condition.length > 0 ? condition : undefined,
      minPrice,
      maxPrice,
      sort,
      page,
    })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, search, conditionKey, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function setFilter(patch: Partial<ProductFilters>) {
    const params = new URLSearchParams(searchParams.toString());

    if (patch.sort !== undefined) params.set("sort", patch.sort);
    if (patch.condition !== undefined) {
      params.delete("condition");
      patch.condition.forEach((c) => params.append("condition", c));
    }
    if (patch.minPrice !== undefined) {
      if (patch.minPrice > 0) params.set("minPrice", String(patch.minPrice));
      else params.delete("minPrice");
    }
    if (patch.maxPrice !== undefined) {
      params.set("maxPrice", String(patch.maxPrice));
    }
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  }

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  return {
    items,
    total,
    page,
    filters: { sort, condition, minPrice, maxPrice } satisfies ProductFilters,
    loading,
    error,
    setFilter,
    setPage,
    retry: fetchProducts,
  };
}
