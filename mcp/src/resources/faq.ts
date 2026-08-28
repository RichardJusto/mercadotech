import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listPublishedArticles } from "../shared/faq";
import type { McpContext } from "../context";
import { safe } from "../lib/safe";

const URI = "mercadotech://faq";

// Cliente anon: support_articles tiene grant select público (schema.sql).
export function registerFaqResource(server: McpServer, ctx: () => McpContext): void {
  server.registerResource(
    "faq",
    URI,
    {
      title: "Artículos de soporte (FAQ)",
      description: "Todos los artículos de soporte publicados.",
      mimeType: "application/json",
    },
    async () =>
      safe(
        async () => {
          const { anon } = ctx();
          const articles = await listPublishedArticles(anon);
          return {
            contents: [
              { uri: URI, mimeType: "application/json", text: JSON.stringify(articles, null, 2) },
            ],
          };
        },
        (message) => ({
          contents: [{ uri: URI, mimeType: "text/plain", text: `Error: ${message}` }],
        }),
      ),
  );
}
