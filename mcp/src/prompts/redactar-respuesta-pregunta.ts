import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getQuestionById } from "../shared/questions";
import { getProductById } from "@/services/product.service";
import type { McpContext } from "../context";
import { NotFoundError } from "../lib/errors";

// Cliente anon: preguntas y productos activos son públicos.
export function registerRedactarRespuestaPreguntaPrompt(
  server: McpServer,
  ctx: () => McpContext,
): void {
  server.registerPrompt(
    "redactar_respuesta_pregunta",
    {
      title: "Redactar respuesta a pregunta",
      description: "Borrador de respuesta para el vendedor, con el contexto del producto.",
      argsSchema: { questionId: z.string().describe("Id de la pregunta") },
    },
    async ({ questionId }) => {
      const { anon } = ctx();
      const question = await getQuestionById(questionId, anon);
      if (!question) throw new NotFoundError("Pregunta", questionId);

      const product = await getProductById(question.product_id, anon);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Redacta un borrador de respuesta, en español y tono cordial, para la ` +
                `pregunta de un comprador sobre "${product.title}". Usa SOLO los datos del ` +
                "producto adjunto — si la pregunta no se puede responder con esos datos, " +
                "dilo con claridad en el borrador en vez de inventar. El vendedor revisa y " +
                "ajusta antes de publicar (esta tool no responde por sí sola).",
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `mercadotech://products/${product.id}`,
                mimeType: "application/json",
                text: JSON.stringify({ question: question.question, product }, null, 2),
              },
            },
          },
        ],
      };
    },
  );
}
