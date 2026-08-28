import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  buildProductEmbeddingText,
  buildSupportArticleEmbeddingText,
  generateEmbedding,
} from "@/lib/ai/embeddings";
import { getPublicUrl } from "@/services/storage.service";

type Client = SupabaseClient<Database>;

const PRODUCT_IMAGES_BUCKET = "product-images";

export type KnowledgeSourceType = "producto" | "articulo_soporte";

export interface IndexResult {
  indexed: boolean;
  reason?: string;
}

// pgvector espera el literal de texto '[n1,n2,...]' en el body JSON que
// recibe PostgREST — un array JS crudo no castea automático a `vector`.
// Exportado: vector-search.service lo reusa para el mismo RPC.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function indexProduct(sourceId: string, supabase: Client): Promise<IndexResult> {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, title, brand, condition, description, price, seller_id, categories(name), product_images(image_path, position)",
    )
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;

  if (!product) {
    // source_id sin FK dura (ver migración de la Fase 4.1): un producto
    // borrado deja su ficha huérfana si no se limpia acá (decisión 6).
    await supabase
      .from("knowledge_embeddings")
      .delete()
      .eq("source_type", "producto")
      .eq("source_id", sourceId);
    return { indexed: false, reason: "producto no existe; ficha eliminada" };
  }

  const categoryName = product.categories?.name ?? "Sin categoría";
  const content = buildProductEmbeddingText(product, categoryName);
  const embedding = await generateEmbedding(content);

  // Portada resuelta al indexar: components/chat/SourcesList (Fase 4.7) la
  // usa para la mini-card de producto citado sin otra ida y vuelta a
  // `products`. Si el producto no tiene imágenes, queda null.
  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
  const imageUrl = images[0] ? getPublicUrl(PRODUCT_IMAGES_BUCKET, images[0].image_path, supabase) : null;

  const { error: upsertError } = await supabase.from("knowledge_embeddings").upsert(
    {
      source_type: "producto",
      source_id: sourceId,
      chunk_index: 0,
      content,
      embedding: toVectorLiteral(embedding),
      metadata: {
        title: product.title,
        price: Number(product.price),
        brand: product.brand,
        category: categoryName,
        image_url: imageUrl,
      },
    },
    { onConflict: "source_type,source_id,chunk_index" },
  );
  if (upsertError) throw upsertError;

  return { indexed: true };
}

async function indexSupportArticle(sourceId: string, supabase: Client): Promise<IndexResult> {
  const { data: article, error } = await supabase
    .from("support_articles")
    .select("id, title, category, content")
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;

  if (!article) {
    await supabase
      .from("knowledge_embeddings")
      .delete()
      .eq("source_type", "articulo_soporte")
      .eq("source_id", sourceId);
    return { indexed: false, reason: "artículo no existe; ficha eliminada" };
  }

  const content = buildSupportArticleEmbeddingText(article);
  const embedding = await generateEmbedding(content);

  const { error: upsertError } = await supabase.from("knowledge_embeddings").upsert(
    {
      source_type: "articulo_soporte",
      source_id: sourceId,
      chunk_index: 0,
      content,
      embedding: toVectorLiteral(embedding),
      metadata: { title: article.title, category: article.category },
    },
    { onConflict: "source_type,source_id,chunk_index" },
  );
  if (upsertError) throw upsertError;

  return { indexed: true };
}

// El cliente con privilegios de servicio se lo inyecta el caller (Route
// Handler o script): este service no decide desde dónde corre ni importa
// el módulo que lo crea.
export async function indexSource(
  sourceType: KnowledgeSourceType,
  sourceId: string,
  supabase: Client,
): Promise<IndexResult> {
  return sourceType === "producto"
    ? indexProduct(sourceId, supabase)
    : indexSupportArticle(sourceId, supabase);
}
