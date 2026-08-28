import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listByProduct } from "@/services/review.service";
import { generateCompletion } from "@/lib/ai/completion";
import { REVIEW_SUMMARY_SYSTEM_INSTRUCTIONS } from "@/lib/ai/prompts";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";

// Cliente anon: las reseñas son públicas (no requieren knowledge_embeddings
// ni RLS especial). Solo se llama a generateCompletion si hay reseñas —
// evita gastar cuota del proveedor gratuito en un producto sin reseñas.
// Requiere HUGGINGFACEHUB_API_TOKEN cuando sí hay reseñas que resumir.
export function registerSummarizeReviews(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "summarize_reviews",
    {
      description:
        "Resume las reseñas de un producto en pros y contras, según lo que dicen compradores reales. " +
        "Requiere el id (uuid) del producto.",
      inputSchema: {
        productId: z.string().uuid().describe("Id del producto"),
      },
    },
    async ({ productId }) =>
      safe(
        async () => {
          const { anon } = ctx();
          const reviews = await listByProduct(productId, anon);

          if (reviews.length === 0) {
            return toolSuccess("Este producto todavía no tiene reseñas.", {
              reviewCount: 0,
              summary: null,
            });
          }

          const userMessage = reviews
            .map((r, i) => `[${i + 1}] Rating ${r.rating}/5: ${r.comment ?? "(sin comentario)"}`)
            .join("\n");

          const completion = await generateCompletion(REVIEW_SUMMARY_SYSTEM_INSTRUCTIONS, userMessage);

          return toolSuccess(completion.text, {
            reviewCount: reviews.length,
            summary: completion.text,
            model: completion.model,
          });
        },
        (message) => toolError(message),
      ),
  );
}
