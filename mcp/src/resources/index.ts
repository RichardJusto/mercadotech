import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context";
import { registerInfoResource } from "./info";
import { registerProductResources } from "./products";
import { registerCategoriesResource } from "./categories";
import { registerSellersResource } from "./sellers";
import { registerFaqResource } from "./faq";
import { registerStatsResource } from "./stats";

// Registro central de resources (7): info, products, products/{id},
// categories, sellers/{sellerId}, faq, stats.
export function registerResources(server: McpServer, ctx: () => McpContext): void {
  registerInfoResource(server);
  registerProductResources(server, ctx);
  registerCategoriesResource(server, ctx);
  registerSellersResource(server, ctx);
  registerFaqResource(server, ctx);
  registerStatsResource(server, ctx);
}
