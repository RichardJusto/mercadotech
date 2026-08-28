import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const INFO_URI = "mercadotech://info";

// Estático, no toca la BD: lección 7 lo confirma como el único resource
// que sigue respondiendo si Supabase está caído por completo.
export function registerInfoResource(server: McpServer): void {
  server.registerResource(
    "info",
    INFO_URI,
    {
      title: "MercadoTech — info de la plataforma",
      description: "Descripción del marketplace y de las capacidades de este servidor MCP.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: INFO_URI,
          mimeType: "text/plain",
          text:
            "MercadoTech es un marketplace de productos tecnológicos (Perú). " +
            "Este servidor MCP expone, de SOLO LECTURA, el mismo catálogo, búsqueda " +
            "semántica y asistente de IA que usa la web — reutilizando los mismos " +
            "services, nunca datos privados de compradores.\n\n" +
            "Capacidades:\n" +
            "- 10 tools: búsqueda de catálogo, búsqueda semántica, asistente de " +
            "compras/soporte, comparación de productos, productos relacionados, " +
            "resumen de reseñas, estadísticas de la tienda y estado de pedidos.\n" +
            "- 7 resources: esta info, catálogo, detalle de producto, categorías, " +
            "perfil público de vendedor, FAQ y estadísticas.\n" +
            "- 5 prompts: ficha de producto, comparación, borrador de respuesta a " +
            "una pregunta, resumen de reseñas y borrador de artículo de FAQ.",
        },
      ],
    }),
  );
}
