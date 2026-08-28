import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hydrateProducts } from "../shared/products";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";
import { InvalidInputError } from "../lib/errors";

// Cliente anon. Reutiliza hydrateProducts (derivación de shared/products.ts
// que compone getProductById — ver el comentario ahí: no existe
// getProductsByIds como asumía la spec). NO se llama además a
// review.service.getAverage: getProductById ya hidrata average_rating/
// review_count vía el mismo join de reviews (product.service.mapProductRow),
// así que pedirlo aparte solo repetiría la misma consulta.
export function registerCompareProducts(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "compare_products",
    {
      description:
        "Compara entre 2 y 4 productos lado a lado: precio, condición, stock, marca, categoría y rating. " +
        "Útil para '¿cuál me conviene, este o aquel?'.",
      inputSchema: {
        ids: z
          .array(z.string().uuid())
          .min(2)
          .max(4)
          .describe("2 a 4 ids de productos a comparar"),
      },
    },
    async ({ ids }) =>
      safe(
        async () => {
          const uniqueIds = [...new Set(ids)];
          if (uniqueIds.length < 2) {
            throw new InvalidInputError("Se necesitan al menos 2 productos distintos para comparar.");
          }
          const { anon } = ctx();
          const products = await hydrateProducts(uniqueIds, anon);
          const missing = uniqueIds.filter((id) => !products.some((p) => p.id === id));

          const comparison = products.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            condition: p.condition,
            brand: p.brand,
            stock: p.stock,
            average_rating: p.average_rating,
            review_count: p.review_count,
          }));

          return toolSuccess(
            missing.length > 0
              ? `Comparando ${products.length} de ${uniqueIds.length} productos (${missing.length} no encontrado(s)).`
              : `Comparando ${products.length} productos.`,
            { comparison, missing },
          );
        },
        (message) => toolError(message),
      ),
  );
}
