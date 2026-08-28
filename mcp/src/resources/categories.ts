import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCategoryCounts } from "../shared/stats";
import type { McpContext } from "../context";
import { safe } from "../lib/safe";

const URI = "mercadotech://categories";

// Cliente anon. Misma derivación que la tool list_categories (#3).
export function registerCategoriesResource(server: McpServer, ctx: () => McpContext): void {
  server.registerResource(
    "categories",
    URI,
    {
      title: "Categorías",
      description: "Categorías del catálogo con cuántos productos activos tiene cada una.",
      mimeType: "application/json",
    },
    async () =>
      safe(
        async () => {
          const { anon } = ctx();
          const categories = await getCategoryCounts(anon);
          return {
            contents: [
              { uri: URI, mimeType: "application/json", text: JSON.stringify(categories, null, 2) },
            ],
          };
        },
        (message) => ({
          contents: [{ uri: URI, mimeType: "text/plain", text: `Error: ${message}` }],
        }),
      ),
  );
}
