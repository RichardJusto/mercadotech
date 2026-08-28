import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ask } from "@/services/chat.service";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";
import { InvalidInputError } from "../lib/errors";

// Cliente ADMIN (decisión 3, misma razón que semantic_search_products):
// chat.service.ask llama a vector-search.service.searchKnowledge contra
// knowledge_embeddings. Requiere HUGGINGFACEHUB_API_TOKEN; sin token,
// degrada con el mismo error accionable de lib/ai/.
export function registerAskAssistant(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "ask_assistant",
    {
      description:
        "Pregunta al asistente de MercadoTech en modo 'compras' (recomienda productos del catálogo) " +
        "o 'soporte' (responde con artículos de ayuda). Misma tubería que /asistente y /soporte en la web: " +
        "búsqueda semántica -> contexto -> respuesta citando fuentes.",
      inputSchema: {
        query: z.string().min(1).describe("Pregunta en lenguaje natural"),
        mode: z.enum(["compras", "soporte"]).describe("compras: recomienda productos. soporte: ayuda/FAQ."),
      },
    },
    async ({ query, mode }) =>
      safe(
        async () => {
          if (!query.trim()) throw new InvalidInputError("La consulta no puede estar vacía.");
          const { admin } = ctx();
          const result = await ask(query, mode, admin);
          return toolSuccess(result.answer, result);
        },
        (message) => toolError(message),
      ),
  );
}
