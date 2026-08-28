import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductDetail } from "../shared/product-detail";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";
import { NotFoundError } from "../lib/errors";

// Cliente anon: ficha de producto activo, imágenes, rating y preguntas son
// todas públicas (mismas tablas que /producto/[id] en la web). Reutiliza
// shared/product-detail.ts, la MISMA función que usa el resource
// mercadotech://products/{id} (Fase 5.4) para no duplicar la composición.
export function registerGetProduct(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "get_product",
    {
      description:
        "Devuelve el detalle completo de un producto: precio, condición, stock, imágenes, " +
        "rating promedio y preguntas/respuestas públicas. Requiere el id (uuid) del producto.",
      inputSchema: {
        productId: z.string().uuid().describe("Id del producto"),
      },
    },
    async ({ productId }) =>
      safe(
        async () => {
          const { anon } = ctx();
          const detail = await getProductDetail(productId, anon).catch(() => {
            throw new NotFoundError("Producto", productId);
          });

          return toolSuccess(
            `${detail.product.title} — S/ ${detail.product.price} (${detail.product.condition}), ` +
              `rating ${detail.rating.average.toFixed(1)}/5 (${detail.rating.count} reseñas).`,
            detail,
          );
        },
        (message) => toolError(message),
      ),
  );
}
