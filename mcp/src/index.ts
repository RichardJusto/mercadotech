// LÍNEA 1 (lección 3, stdout es sagrado): con transporte stdio, stdout
// transporta JSON-RPC. Un solo console.log/info/warn en cualquier módulo
// importado más abajo (incluidos services/ y lib/ai/, escritos para la web
// donde esto era inofensivo) corrompería la conexión. Se redirigen a
// stderr ANTES de importar nada más.
console.log = console.error.bind(console);
console.info = console.error.bind(console);
console.warn = console.error.bind(console);

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadEnvLocal } from "./env";
import { createServer } from "./server";

async function main() {
  loadEnvLocal();

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("mercadotech-mcp falló al arrancar:", err);
  process.exit(1);
});
