"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/types/product";

export interface SemanticSearchResult {
  product: Product;
  similarity: number;
}

// Llama directo a /api/v1/search/semantic (sin service intermedio): a
// diferencia de triggerReindex, esta llamada solo la usa este hook — un
// service compartido no aporta nada acá (ver indexing-trigger.service.ts
// para el caso en que sí vale la pena, porque lo llaman dos hooks).
export function useSemanticSearch(query: string) {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "No se pudo completar la búsqueda inteligente.");
      }
      setResults(body.results as SemanticSearchResult[]);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    search();
  }, [search]);

  return { results, loading, error, retry: search };
}
