import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hydrateProducts } from "../shared/products";
import type { McpContext } from "../context";
import { InvalidInputError } from "../lib/errors";

// Los argumentos de un Prompt MCP viajan como strings por protocolo (nunca
// arrays/objetos) — a diferencia del inputSchema de las tools. "ids" entra
// como texto separado por comas y se parsea acá.
export function registerCompararProductosPrompt(server: McpServer, ctx: () => McpContext): void {
  server.registerPrompt(
    "comparar_productos",
    {
      title: "Comparar productos",
      description: "Tabla comparativa de 2 a 4 productos + recomendación según perfil de uso.",
      argsSchema: { ids: z.string().describe("2 a 4 ids de producto separados por coma") },
    },
    async ({ ids }) => {
      const uniqueIds = [...new Set(ids.split(",").map((id) => id.trim()).filter(Boolean))];
      if (uniqueIds.length < 2 || uniqueIds.length > 4) {
        throw new InvalidInputError("Se necesitan entre 2 y 4 ids de producto separados por coma.");
      }

      const { anon } = ctx();
      const products = await hydrateProducts(uniqueIds, anon);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Compara estos ${products.length} productos en una tabla (precio, condición, ` +
                "marca, stock, rating) y cierra con una recomendación breve según distintos " +
                "perfiles de uso (ej. 'para trabajo', 'para gaming', 'presupuesto ajustado'), " +
                "SOLO con los datos adjuntos — no inventes especificaciones. " +
                "Para más detalle de uno en particular, usa la tool get_product.",
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `mercadotech://products?ids=${uniqueIds.join(",")}`,
                mimeType: "application/json",
                text: JSON.stringify(products, null, 2),
              },
            },
          },
        ],
      };
    },
  );
}
