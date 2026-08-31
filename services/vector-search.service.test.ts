import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";
import {
  VECTOR_SEARCH_MAX_TOP_K,
  VECTOR_SEARCH_DEFAULT_TOP_K,
  VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
} from "@/lib/constants/ai";

vi.mock("@/lib/ai/embeddings", () => ({
  generateEmbedding: vi.fn(),
}));

import { generateEmbedding } from "@/lib/ai/embeddings";
import { searchByEmbedding, searchKnowledge, searchProducts } from "@/services/vector-search.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("vector-search.service.searchByEmbedding", () => {
  it("pasa topK (recortado a VECTOR_SEARCH_MAX_TOP_K) y el threshold al RPC", async () => {
    const supabase = createSupabaseMock({
      rpc: { match_knowledge: { data: [], error: null } },
    });

    await searchByEmbedding([1, 2, 3], { topK: VECTOR_SEARCH_MAX_TOP_K + 50 }, supabase as never);

    expect(supabase.rpc).toHaveBeenCalledWith("match_knowledge", {
      query_embedding: "[1,2,3]",
      p_source_type: undefined,
      match_count: VECTOR_SEARCH_MAX_TOP_K,
      similarity_threshold: VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
    });
  });

  it("usa los defaults cuando no se pasan opts", async () => {
    const supabase = createSupabaseMock({ rpc: { match_knowledge: { data: [], error: null } } });
    await searchByEmbedding([1], {}, supabase as never);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "match_knowledge",
      expect.objectContaining({ match_count: VECTOR_SEARCH_DEFAULT_TOP_K }),
    );
  });

  it("propaga el error del RPC", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ rpc: { match_knowledge: { data: null, error: boom } } });
    await expect(searchByEmbedding([1], {}, supabase as never)).rejects.toBe(boom);
  });
});

describe("vector-search.service.searchKnowledge", () => {
  it("genera el embedding de la consulta y llama al RPC con él", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([9, 9]);
    const supabase = createSupabaseMock({ rpc: { match_knowledge: { data: [], error: null } } });

    await searchKnowledge("laptop liviana", {}, supabase as never);

    expect(generateEmbedding).toHaveBeenCalledWith("laptop liviana");
    expect(supabase.rpc).toHaveBeenCalledWith(
      "match_knowledge",
      expect.objectContaining({ query_embedding: "[9,9]" }),
    );
  });
});

describe("vector-search.service.searchProducts", () => {
  it("hidrata con precio/imagen actuales y descarta huérfanos (producto ya inexistente)", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([1]);
    const supabase = createSupabaseMock({
      rpc: {
        match_knowledge: {
          data: [
            { source_type: "producto", source_id: "existe", content: "c", metadata: {}, similarity: 0.9 },
            { source_type: "producto", source_id: "borrado", content: "c", metadata: {}, similarity: 0.5 },
          ],
          error: null,
        },
      },
      tables: {
        products: {
          data: [
            {
              id: "existe",
              title: "Laptop",
              price: "100.00",
              condition: "nuevo",
              product_images: [],
              reviews: [],
            },
          ],
          error: null,
        },
      },
    });

    const result = await searchProducts("laptop", {}, supabase as never);

    expect(result).toHaveLength(1);
    expect(result[0].product.id).toBe("existe");
    expect(result[0].similarity).toBe(0.9);
  });

  it("sin coincidencias del RPC: no consulta products y devuelve []", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([1]);
    const supabase = createSupabaseMock({ rpc: { match_knowledge: { data: [], error: null } } });

    const result = await searchProducts("nada relacionado", {}, supabase as never);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
