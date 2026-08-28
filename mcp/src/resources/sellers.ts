import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSellerProfile, listSellersWithActiveProducts } from "../shared/sellers";
import type { McpContext } from "../context";
import { safe } from "../lib/safe";

// mercadotech://sellers/{sellerId} — SOLO display_name + productos
// activos, JAMÁS phone/email/role (decisión 5). Cliente ADMIN: profiles
// no tiene SELECT público (deuda de la Sesión 3, sin public_profiles).
export function registerSellersResource(server: McpServer, ctx: () => McpContext): void {
  const template = new ResourceTemplate("mercadotech://sellers/{sellerId}", {
    list: async () => {
      return safe(
        async () => {
          const { admin } = ctx();
          const sellers = await listSellersWithActiveProducts(admin);
          return {
            resources: sellers.map((s) => ({
              uri: `mercadotech://sellers/${s.id}`,
              name: s.displayName,
              mimeType: "application/json",
            })),
          };
        },
        () => ({ resources: [] }),
      );
    },
  });

  server.registerResource(
    "seller-profile",
    template,
    {
      title: "Perfil público de vendedor",
      description: "Nombre público del vendedor y sus productos activos. Nunca teléfono ni email.",
      mimeType: "application/json",
    },
    async (uri, variables) =>
      safe(
        async () => {
          const { admin } = ctx();
          const sellerId = String(variables.sellerId);
          const profile = await getSellerProfile(sellerId, admin);
          if (!profile) {
            return {
              contents: [
                { uri: uri.toString(), mimeType: "text/plain", text: "Vendedor no encontrado." },
              ],
            };
          }
          return {
            contents: [
              { uri: uri.toString(), mimeType: "application/json", text: JSON.stringify(profile, null, 2) },
            ],
          };
        },
        (message) => ({
          contents: [{ uri: uri.toString(), mimeType: "text/plain", text: `Error: ${message}` }],
        }),
      ),
  );
}
