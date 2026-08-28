import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductById, getProductImages } from "@/services/product.service";
import { getAverage } from "@/services/review.service";
import { listByProduct } from "@/services/question.service";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";
import { NotFoundError } from "../lib/errors";

// Cliente anon: ficha de producto activo, imágenes, rating y preguntas son
// todas públicas (mismas tablas que /producto/[id] en la web).
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
          const [product, images, rating, questions] = await Promise.all([
            getProductById(productId, anon).catch(() => {
              throw new NotFoundError("Producto", productId);
            }),
            getProductImages(productId, anon),
            getAverage(productId, anon),
            listByProduct(productId, anon),
          ]);

          return toolSuccess(
            `${product.title} — S/ ${product.price} (${product.condition}), ` +
              `rating ${rating.average.toFixed(1)}/5 (${rating.count} reseñas).`,
            { product, images, rating, questions },
          );
        },
        (message) => toolError(message),
      ),
  );
}
