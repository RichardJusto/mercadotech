import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createContext } from "./context";
import { registerTools } from "./tools/index";
import { registerResources } from "./resources/index";
import { registerPrompts } from "./prompts/index";

// Metadata + registro de capabilities. Las funciones de registro son cada
// una responsable de su propio dominio (tools / resources / prompts);
// server.ts solo las orquesta, no conoce el detalle de ninguna. Se les
// pasa la FÁBRICA createContext (no un contexto ya creado) para que cada
// tool/resource la invoque dentro de su propio handler (lección 5).
export function createServer(): McpServer {
  const server = new McpServer({
    name: "mercadotech",
    version: "0.1.0",
  });

  registerTools(server, createContext);
  registerResources(server, createContext);
  registerPrompts(server, createContext);

  return server;
}
