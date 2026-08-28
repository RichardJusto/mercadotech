import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStoreStats } from "../shared/stats";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";

// anon + ADMIN (decisión 4 y 6): el conteo por categoría y el rango de
// precios usan anon (misma RLS pública del catálogo); el top vendidos
// necesita admin porque order_items no es legible por anon. Ver
// shared/stats.ts para el detalle de la derivación. Solo agregados, cero
// datos personales.
export function registerGetStoreStats(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "get_store_stats",
    {
      description:
        "Estadísticas agregadas de la tienda: total de productos activos, productos por categoría, " +
        "rango de precios y los más vendidos. Ningún dato de compradores.",
      inputSchema: {},
    },
    async () =>
      safe(
        async () => {
          const { anon, admin } = ctx();
          const stats = await getStoreStats(anon, admin);
          return toolSuccess(
            `${stats.totalActiveProducts} productos activos en ${stats.categories.length} categorías.`,
            stats,
          );
        },
        (message) => toolError(message),
      ),
  );
}
