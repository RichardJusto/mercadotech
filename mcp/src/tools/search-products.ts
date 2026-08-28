import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listActiveProducts } from "@/services/product.service";
import { PRODUCT_CONDITIONS } from "@/lib/constants/roles";
import { SORT_OPTIONS } from "@/lib/constants/catalog";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as [string, ...string[]];

// Cliente anon: catálogo activo es público (misma tabla y filtros que
// /buscar en la web, tool #1 de la Fase 5.3).
export function registerSearchProducts(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "search_products",
    {
      description:
        "Busca productos activos del catálogo de MercadoTech por texto, categoría, precio o condición. " +
        "Responde preguntas como '¿qué laptops tienen?' o '¿hay audífonos bajo S/ 300?'.",
      inputSchema: {
        search: z.string().optional().describe("Texto libre: busca en título y marca"),
        categorySlug: z.string().optional().describe("Slug de categoría, ej. 'laptops'"),
        condition: z
          .array(z.enum(PRODUCT_CONDITIONS as unknown as [string, ...string[]]))
          .optional()
          .describe("Filtra por condición: nuevo, usado, reacondicionado"),
        minPrice: z.number().nonnegative().optional(),
        maxPrice: z.number().nonnegative().optional(),
        sort: z.enum(SORT_VALUES).optional().describe("Orden: recientes, precio_asc, precio_desc"),
        page: z.number().int().positive().optional(),
      },
    },
    async (args) =>
      safe(
        async () => {
          const { anon } = ctx();
          const result = await listActiveProducts(
            {
              search: args.search,
              categorySlug: args.categorySlug,
              condition: args.condition as never,
              minPrice: args.minPrice,
              maxPrice: args.maxPrice,
              sort: args.sort as never,
              page: args.page,
            },
            anon,
          );
          return toolSuccess(
            `${result.total} producto(s) encontrado(s), mostrando ${result.items.length}.`,
            result,
          );
        },
        (message) => toolError(message),
      ),
  );
}
