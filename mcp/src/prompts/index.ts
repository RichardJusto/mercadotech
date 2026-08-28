import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context";
import { registerDescribirProductoPrompt } from "./describir-producto";
import { registerCompararProductosPrompt } from "./comparar-productos";
import { registerRedactarRespuestaPreguntaPrompt } from "./redactar-respuesta-pregunta";
import { registerResumenDeResenasPrompt } from "./resumen-de-resenas";
import { registerGenerarArticuloFaqPrompt } from "./generar-articulo-faq";

// Registro central de Prompts MCP (5) — NO son Skills de Claude Code
// (lección 2): viven en el servidor y las ofrece el protocolo.
export function registerPrompts(server: McpServer, ctx: () => McpContext): void {
  registerDescribirProductoPrompt(server, ctx);
  registerCompararProductosPrompt(server, ctx);
  registerRedactarRespuestaPreguntaPrompt(server, ctx);
  registerResumenDeResenasPrompt(server, ctx);
  registerGenerarArticuloFaqPrompt(server, ctx);
}
