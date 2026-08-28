import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCategoryCounts } from "../shared/stats";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";

// Cliente anon. Conteo por categoría derivado en shared/stats.ts
// (decisión 6: no existe un service de agregados).
export function registerListCategories(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "list_categories",
    {
      description:
        "Lista las categorías del catálogo de MercadoTech con cuántos productos activos tiene cada una.",
      inputSchema: {},
    },
    async () =>
      safe(
        async () => {
          const { anon } = ctx();
          const categories = await getCategoryCounts(anon);
          return toolSuccess(`${categories.length} categorías.`, { categories });
        },
        (message) => toolError(message),
      ),
  );
}
