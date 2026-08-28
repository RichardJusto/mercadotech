import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchProducts } from "@/services/vector-search.service";
import { VECTOR_SEARCH_DEFAULT_TOP_K, VECTOR_SEARCH_MAX_TOP_K } from "@/lib/constants/ai";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";

// Cliente ADMIN (decisión 3): knowledge_embeddings solo permite SELECT a
// `authenticated` — anon no puede correr el RPC match_knowledge. Requiere
// HUGGINGFACEHUB_API_TOKEN para generar el embedding de la consulta; sin
// token, lib/ai/embeddings.ts lanza un error accionable que acá se
// convierte en resultado de error de la tool (degradación con gracia,
// nunca tumba el servidor).
export function registerSemanticSearchProducts(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "semantic_search_products",
    {
      description:
        "Busca productos por significado, no por coincidencia exacta de palabras (búsqueda semántica). " +
        "Útil para pedidos como 'algo para hacer ejercicio con música' o 'para trabajar desde casa'. " +
        "Misma calidad que la pestaña 'Resultados con IA' de la web.",
      inputSchema: {
        query: z.string().min(1).describe("Descripción en lenguaje natural de lo que se busca"),
        topK: z
          .number()
          .int()
          .positive()
          .max(VECTOR_SEARCH_MAX_TOP_K)
          .optional()
          .describe(`Cuántos resultados como máximo (default ${VECTOR_SEARCH_DEFAULT_TOP_K})`),
      },
    },
    async ({ query, topK }) =>
      safe(
        async () => {
          const { admin } = ctx();
          const results = await searchProducts(query, { topK }, admin);
          return toolSuccess(
            results.length > 0
              ? `${results.length} producto(s) relacionados con "${query}".`
              : `Ningún producto coincide semánticamente con "${query}".`,
            { results },
          );
        },
        (message) => toolError(message),
      ),
  );
}
