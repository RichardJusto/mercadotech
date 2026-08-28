import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOrderById } from "@/services/order.service";
import type { McpContext } from "../context";
import { toolSuccess, toolError } from "../lib/tool-result";
import { safe } from "../lib/safe";
import { NotFoundError } from "../lib/errors";

// Cliente ADMIN (decisión 4): orders/order_items no son legibles por anon.
// La reutiliza el agente de voz de la Sesión 8. Expone SOLO estado, fecha,
// total e ítems (title_snapshot/price_snapshot/quantity) — NUNCA buyer_id
// ni ningún dato del comprador. En producción esto exigiría verificar que
// quien pregunta es el dueño del pedido (autenticación del comprador);
// acá no hay sesión de usuario en el protocolo MCP, así que queda
// documentado como limitación, no resuelto.
export function registerGetOrderStatus(server: McpServer, ctx: () => McpContext): void {
  server.registerTool(
    "get_order_status",
    {
      description:
        "Consulta el estado de un pedido: estado actual, fecha, total e ítems comprados (snapshots). " +
        "Nunca expone datos del comprador. Requiere el id (uuid) del pedido.",
      inputSchema: {
        orderId: z.string().uuid().describe("Id del pedido"),
      },
    },
    async ({ orderId }) =>
      safe(
        async () => {
          const { admin } = ctx();
          const order = await getOrderById(orderId, admin).catch(() => {
            throw new NotFoundError("Pedido", orderId);
          });

          const publicOrder = {
            id: order.id,
            status: order.status,
            created_at: order.created_at,
            total: order.total,
            items: order.items.map((item) => ({
              title: item.title_snapshot,
              price: item.price_snapshot,
              quantity: item.quantity,
            })),
          };

          return toolSuccess(
            `Pedido ${order.id}: ${order.status}, S/ ${order.total}, ${order.items.length} ítem(s).`,
            publicOrder,
          );
        },
        (message) => toolError(message),
      ),
  );
}
