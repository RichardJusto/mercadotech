import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

// Mockeo de dos niveles (decisión 7): Supabase se inyecta con el mock
// encadenable; lib/ai/* (la única excepción) se mockea con vi.mock de módulo.
vi.mock("@/lib/ai/embeddings", () => ({
  generateEmbedding: vi.fn(),
  buildProductEmbeddingText: vi.fn(),
  buildSupportArticleEmbeddingText: vi.fn(),
}));

import {
  generateEmbedding,
  buildProductEmbeddingText,
  buildSupportArticleEmbeddingText,
} from "@/lib/ai/embeddings";
import { indexSource, toVectorLiteral } from "@/services/embedding.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("embedding.service.toVectorLiteral", () => {
  it("arma el literal de texto que espera pgvector", () => {
    expect(toVectorLiteral([1, 2, 3])).toBe("[1,2,3]");
  });
});

describe("embedding.service.indexSource — producto", () => {
  const productRow = {
    id: "p1",
    title: "Laptop Dell XPS 13",
    brand: "Dell",
    condition: "nuevo",
    description: "Ultrabook",
    price: "4299.00",
    seller_id: "s1",
    categories: { name: "Laptops" },
    product_images: [],
  };

  it("construye el texto, genera el embedding y hace upsert con onConflict", async () => {
    vi.mocked(buildProductEmbeddingText).mockReturnValue("texto armado");
    vi.mocked(generateEmbedding).mockResolvedValue(new Array(384).fill(0.1));

    const supabase = createSupabaseMock({
      tables: { products: { data: productRow, error: null } },
    });

    const result = await indexSource("producto", "p1", supabase as never);

    expect(result).toEqual({ indexed: true });
    expect(buildProductEmbeddingText).toHaveBeenCalledWith(productRow, "Laptops");

    const upsertQuery = supabase.from.mock.results[1].value;
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "producto",
        source_id: "p1",
        content: "texto armado",
      }),
      { onConflict: "source_type,source_id,chunk_index" },
    );
  });

  it("producto inexistente: borra la ficha huérfana y no indexa (decisión 6)", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: null, error: null } },
    });

    const result = await indexSource("producto", "p-borrado", supabase as never);

    expect(result).toEqual({ indexed: false, reason: "producto no existe; ficha eliminada" });
    const deleteQuery = supabase.from.mock.results[1].value;
    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it("propaga el error del proveedor de embeddings", async () => {
    vi.mocked(buildProductEmbeddingText).mockReturnValue("texto armado");
    const boom = new Error("No se pudo generar el embedding: 401");
    vi.mocked(generateEmbedding).mockRejectedValue(boom);

    const supabase = createSupabaseMock({
      tables: { products: { data: productRow, error: null } },
    });

    await expect(indexSource("producto", "p1", supabase as never)).rejects.toBe(boom);
  });

  it("propaga el error del upsert", async () => {
    vi.mocked(buildProductEmbeddingText).mockReturnValue("texto armado");
    vi.mocked(generateEmbedding).mockResolvedValue(new Array(384).fill(0.1));
    const boom = new Error("permission denied");

    const supabase = createSupabaseMock({
      tables: {
        products: { data: productRow, error: null },
        knowledge_embeddings: { data: null, error: boom },
      },
    });

    await expect(indexSource("producto", "p1", supabase as never)).rejects.toBe(boom);
  });
});

describe("embedding.service.indexSource — artículo de soporte", () => {
  const articleRow = { id: "a1", title: "¿Cómo devuelvo un producto?", category: "devoluciones", content: "..." };

  it("construye el texto, genera el embedding y hace upsert", async () => {
    vi.mocked(buildSupportArticleEmbeddingText).mockReturnValue("faq armada");
    vi.mocked(generateEmbedding).mockResolvedValue(new Array(384).fill(0.2));

    const supabase = createSupabaseMock({
      tables: { support_articles: { data: articleRow, error: null } },
    });

    const result = await indexSource("articulo_soporte", "a1", supabase as never);

    expect(result).toEqual({ indexed: true });
    expect(buildSupportArticleEmbeddingText).toHaveBeenCalledWith(articleRow);
  });

  it("artículo inexistente: borra la ficha huérfana", async () => {
    const supabase = createSupabaseMock({
      tables: { support_articles: { data: null, error: null } },
    });

    const result = await indexSource("articulo_soporte", "a-borrado", supabase as never);
    expect(result).toEqual({ indexed: false, reason: "artículo no existe; ficha eliminada" });
  });
});
