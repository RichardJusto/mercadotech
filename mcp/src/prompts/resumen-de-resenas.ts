import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductById } from "@/services/product.service";
import { listByProduct } from "@/services/review.service";
import type { McpContext } from "../context";

// Distinto de la tool summarize_reviews (#8): esa tool llama al LLM en el
// servidor y devuelve el resumen ya hecho, para un cliente sin LLM propio.
// Este Prompt en cambio embebe las reseñas crudas para que el CLIENTE
// (que sí es un LLM, ej. Claude Code) las resuma él mismo — mismo patrón
// que el resto de los prompts (embeber, no reimplementar). Cliente anon.
export function registerResumenDeResenasPrompt(server: McpServer, ctx: () => McpContext): void {
  server.registerPrompt(
    "resumen_de_resenas",
    {
      title: "Resumen de reseñas",
      description: "Pros/contras de un producto según compradores reales.",
      argsSchema: { productId: z.string().describe("Id del producto") },
    },
    async ({ productId }) => {
      const { anon } = ctx();
      const [product, reviews] = await Promise.all([
        getProductById(productId, anon),
        listByProduct(productId, anon),
      ]);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Resume en Pros y Contras las reseñas de "${product.title}", SOLO con lo que ` +
                "dicen las reseñas adjuntas — si no hay reseñas, dilo en vez de inventar.",
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `mercadotech://products/${productId}`,
                mimeType: "application/json",
                text: JSON.stringify({ product: product.title, reviews }, null, 2),
              },
            },
          },
        ],
      };
    },
  );
}
