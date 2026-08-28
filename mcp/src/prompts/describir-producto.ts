import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductDetail } from "../shared/product-detail";
import type { McpContext } from "../context";

// Prompt MCP (NO es una Skill de Claude Code — lección 2): formulario
// pre-redactado que embebe el producto REAL como resource, para que quien
// redacte la ficha no invente specs ni stock. Cliente anon.
export function registerDescribirProductoPrompt(server: McpServer, ctx: () => McpContext): void {
  server.registerPrompt(
    "describir_producto",
    {
      title: "Describir producto",
      description: "Redacta una ficha de producto atractiva y FIEL, sin inventar specs ni stock.",
      argsSchema: { productId: z.string().describe("Id del producto") },
    },
    async ({ productId }) => {
      const { anon } = ctx();
      const detail = await getProductDetail(productId, anon);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Redacta una ficha de producto atractiva para "${detail.product.title}", ` +
                "en español, para el catálogo de MercadoTech. Usa ÚNICAMENTE los datos del " +
                "producto adjunto (recurso mercadotech://products/" +
                productId +
                ") — no inventes características, marca, precio ni stock que no estén ahí. " +
                "Si necesitas profundizar en preguntas/respuestas o reseñas, usa las tools " +
                "get_product o summarize_reviews del servidor mercadotech.",
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `mercadotech://products/${productId}`,
                mimeType: "application/json",
                text: JSON.stringify(detail, null, 2),
              },
            },
          },
        ],
      };
    },
  );
}
