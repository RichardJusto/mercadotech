import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductById } from "@/services/product.service";
import { listCategories } from "@/services/category.service";
import { generateEmbedding, buildProductEmbeddingText } from "@/lib/ai/embeddings";
import { searchByEmbedding } from "@/services/vector-search.service";
import { VECTOR_SEARCH_DEFAULT_TOP_K, VECTOR_SEARCH_MAX_TOP_K } from "@/lib/constants/ai";
import { hydrateProducts } from "../shared/products";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";
import { NotFoundError } from "../lib/errors";

// Cliente ADMIN (decisión 3): igual que semantic_search_products, corre
// contra knowledge_embeddings. "Más como este": arma el mismo texto de
// embedding que usa la indexación (lib/ai/embeddings.buildProductEmbeddingText)
// a partir del producto YA existente, genera su vector, y busca vecinos con
// vector-search.service.searchByEmbedding — sin pasar por un texto de
// consulta escrito a mano. Requiere HUGGINGFACEHUB_API_TOKEN.
export function registerFindRelatedProducts(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "find_related_products",
    {
      description:
        "Dado un producto, encuentra otros productos activos semánticamente parecidos (\"más como este\"). " +
        "Requiere el id (uuid) del producto de referencia.",
      inputSchema: {
        productId: z.string().uuid().describe("Id del producto de referencia"),
        topK: z
          .number()
          .int()
          .positive()
          .max(VECTOR_SEARCH_MAX_TOP_K)
          .optional()
          .describe(`Cuántos relacionados como máximo (default ${VECTOR_SEARCH_DEFAULT_TOP_K})`),
      },
    },
    async ({ productId, topK }) =>
      safe(
        async () => {
          const { admin } = ctx();

          const product = await getProductById(productId, admin).catch(() => {
            throw new NotFoundError("Producto", productId);
          });
          const categories = await listCategories(admin);
          const categoryName = categories.find((c) => c.id === product.category_id)?.name ?? "Sin categoría";

          const embeddingText = buildProductEmbeddingText(product, categoryName);
          const embedding = await generateEmbedding(embeddingText);

          const matches = await searchByEmbedding(
            embedding,
            { sourceType: "producto", topK: (topK ?? VECTOR_SEARCH_DEFAULT_TOP_K) + 1 },
            admin,
          );

          const relatedIds = matches
            .map((m) => m.source_id)
            .filter((id) => id !== productId)
            .slice(0, topK ?? VECTOR_SEARCH_DEFAULT_TOP_K);

          const related = await hydrateProducts(relatedIds, admin);
          const withSimilarity = related.map((p) => ({
            product: p,
            similarity: matches.find((m) => m.source_id === p.id)?.similarity ?? null,
          }));

          return toolSuccess(
            `${related.length} producto(s) relacionados con "${product.title}".`,
            { source: { id: product.id, title: product.title }, related: withSimilarity },
          );
        },
        (message) => toolError(message),
      ),
  );
}
