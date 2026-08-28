import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Formateo consistente de resultados: cada tool devuelve texto legible
// (lo que un cliente sin UI estructurada puede mostrar tal cual) MÁS el
// JSON crudo como bloque de código, para que un cliente que sepa parsear
// datos estructurados también pueda hacerlo sin una segunda llamada.
export function toolSuccess(summary: string, data: unknown): CallToolResult {
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: "```json\n" + JSON.stringify(data, null, 2) + "\n```" },
    ],
  };
}

export function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
