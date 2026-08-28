import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductDetail } from "../shared/product-detail";
import { getAllActiveProducts } from "../shared/products";
import type { McpContext } from "../context";
import { safe } from "../lib/safe";

const LIST_URI = "mercadotech://products";

export function registerProductResources(server: McpServer, ctx: () => McpContext): void {
  // mercadotech://products — resumen del catálogo activo. Cliente anon.
  server.registerResource(
    "products",
    LIST_URI,
    {
      title: "Catálogo de productos activos",
      description: "Resumen (id, título, precio, categoría) de todos los productos activos.",
      mimeType: "application/json",
    },
    async () =>
      safe(
        async () => {
          const { anon } = ctx();
          const items = await getAllActiveProducts(anon);
          const summary = items.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            category_id: p.category_id,
          }));
          return {
            contents: [
              {
                uri: LIST_URI,
                mimeType: "application/json",
                text: JSON.stringify(summary, null, 2),
              },
            ],
          };
        },
        (message) => ({
          contents: [{ uri: LIST_URI, mimeType: "text/plain", text: `Error: ${message}` }],
        }),
      ),
  );

  // mercadotech://products/{id} — detalle, misma función que la tool
  // get_product (#2): shared/product-detail.ts. Cliente anon.
  const template = new ResourceTemplate("mercadotech://products/{id}", {
    list: async () => {
      return safe(
        async () => {
          const { anon } = ctx();
          const items = await getAllActiveProducts(anon);
          return {
            resources: items.map((p) => ({
              uri: `mercadotech://products/${p.id}`,
              name: p.title,
              mimeType: "application/json",
            })),
          };
        },
        () => ({ resources: [] }),
      );
    },
  });

  server.registerResource(
    "product-detail",
    template,
    {
      title: "Detalle de producto",
      description: "Detalle completo de un producto activo por id (misma forma que la tool get_product).",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      safe(
        async () => {
          const { anon } = ctx();
          const id = String(variables.id);
          const detail = await getProductDetail(id, anon);
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: "application/json",
                text: JSON.stringify(detail, null, 2),
              },
            ],
          };
        },
        (message) => ({
          contents: [{ uri: uri.toString(), mimeType: "text/plain", text: `Error: ${message}` }],
        }),
      ),
  );
}
