import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStoreStats } from "../shared/stats";
import type { McpContext } from "../context";
import { safe } from "../lib/safe";

const URI = "mercadotech://stats";

// anon + admin: misma derivación que la tool get_store_stats (#9).
export function registerStatsResource(server: McpServer, ctx: () => McpContext): void {
  server.registerResource(
    "stats",
    URI,
    {
      title: "Estadísticas de la tienda",
      description: "Agregados: productos activos, por categoría, rango de precios, más vendidos.",
      mimeType: "application/json",
    },
    async () =>
      safe(
        async () => {
          const { anon, admin } = ctx();
          const stats = await getStoreStats(anon, admin);
          return {
            contents: [
              { uri: URI, mimeType: "application/json", text: JSON.stringify(stats, null, 2) },
            ],
          };
        },
        (message) => ({
          contents: [{ uri: URI, mimeType: "text/plain", text: `Error: ${message}` }],
        }),
      ),
  );
}
