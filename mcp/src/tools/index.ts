import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context";
import { registerSearchProducts } from "./search-products";
import { registerGetProduct } from "./get-product";
import { registerListCategories } from "./list-categories";
import { registerSemanticSearchProducts } from "./semantic-search-products";
import { registerAskAssistant } from "./ask-assistant";
import { registerCompareProducts } from "./compare-products";
import { registerFindRelatedProducts } from "./find-related-products";
import { registerSummarizeReviews } from "./summarize-reviews";
import { registerGetStoreStats } from "./get-store-stats";
import { registerGetOrderStatus } from "./get-order-status";

// Registro central: agregar una tool = un archivo en mcp/src/tools/ + una
// línea acá. `ctx` es la fábrica createContext (no un contexto ya creado):
// cada tool la invoca DENTRO de su handler, así los clientes Supabase se
// crean por llamada (lección 5), nunca al arrancar el servidor.
export function registerTools(server: McpServer, ctx: () => McpContext): void {
  registerSearchProducts(server, ctx);
  registerGetProduct(server, ctx);
  registerListCategories(server, ctx);
  registerSemanticSearchProducts(server, ctx);
  registerAskAssistant(server, ctx);
  registerCompareProducts(server, ctx);
  registerFindRelatedProducts(server, ctx);
  registerSummarizeReviews(server, ctx);
  registerGetStoreStats(server, ctx);
  registerGetOrderStatus(server, ctx);
}
