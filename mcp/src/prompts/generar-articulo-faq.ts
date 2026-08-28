import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listPublishedArticles } from "../shared/faq";
import type { McpContext } from "../context";

// Cliente anon: support_articles tiene grant select público.
export function registerGenerarArticuloFaqPrompt(server: McpServer, ctx: () => McpContext): void {
  server.registerPrompt(
    "generar_articulo_faq",
    {
      title: "Generar artículo de FAQ",
      description: "Borrador de artículo de soporte nuevo, con el estilo de los ya publicados.",
      argsSchema: { tema: z.string().describe("Tema del artículo nuevo, ej. 'cambios de dirección de envío'") },
    },
    async ({ tema }) => {
      const { anon } = ctx();
      const articles = await listPublishedArticles(anon);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Redacta un borrador de artículo de soporte nuevo sobre "${tema}", en español, ` +
                "con el MISMO estilo y tono que los artículos ya publicados (adjuntos: título " +
                "tipo pregunta, respuesta corta y directa, categoría). No inventes políticas " +
                "de MercadoTech que no se puedan inferir del estilo existente — dejá una nota " +
                "donde el contenido real deba confirmarlo un humano.",
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: "mercadotech://faq",
                mimeType: "application/json",
                text: JSON.stringify(articles, null, 2),
              },
            },
          },
        ],
      };
    },
  );
}
