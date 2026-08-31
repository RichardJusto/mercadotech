import { describe, expect, it } from "vitest";
import { checkout, cancelIfPending, listMyOrders, getOrderById } from "@/services/order.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

describe("order.service.checkout", () => {
  it("llama al RPC create_order_from_cart con p_buyer_id y devuelve el id del pedido", async () => {
    const supabase = createSupabaseMock({
      rpc: { create_order_from_cart: { data: "order-123", error: null } },
    });

    const orderId = await checkout("buyer-1", supabase as never);

    expect(supabase.rpc).toHaveBeenCalledWith("create_order_from_cart", { p_buyer_id: "buyer-1" });
    expect(orderId).toBe("order-123");
  });

  it("propaga el MENSAJE de error de Postgres (ej. stock insuficiente) tal cual", async () => {
    const boom = new Error("Stock insuficiente para Laptop Dell XPS 13");
    const supabase = createSupabaseMock({
      rpc: { create_order_from_cart: { data: null, error: boom } },
    });

    await expect(checkout("buyer-1", supabase as never)).rejects.toThrow(
      "Stock insuficiente para Laptop Dell XPS 13",
    );
  });
});

describe("order.service.cancelIfPending", () => {
  it("filtra por status='pendiente' al actualizar", async () => {
    const supabase = createSupabaseMock({
      tables: { orders: { data: null, error: null } },
    });

    await cancelIfPending("order-1", supabase as never);

    const ordersQuery = supabase.from.mock.results[0].value;
    expect(ordersQuery.update).toHaveBeenCalledWith({ status: "cancelado" });
    expect(ordersQuery.eq).toHaveBeenNthCalledWith(1, "id", "order-1");
    expect(ordersQuery.eq).toHaveBeenNthCalledWith(2, "status", "pendiente");
  });

  it("propaga el error tal cual", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      tables: { orders: { data: null, error: boom } },
    });

    await expect(cancelIfPending("order-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("order.service.listMyOrders", () => {
  it("mapea status y total (numeric string -> number)", async () => {
    const supabase = createSupabaseMock({
      tables: {
        orders: { data: [{ id: "o1", status: "pagado", total: "199.90" }], error: null },
      },
    });

    const orders = await listMyOrders("buyer-1", supabase as never);
    expect(orders[0]).toMatchObject({ id: "o1", status: "pagado", total: 199.9 });
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { orders: { data: null, error: boom } } });
    await expect(listMyOrders("buyer-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("order.service.getOrderById", () => {
  it("caso feliz: pedido + items con price_snapshot numérico", async () => {
    const supabase = createSupabaseMock({
      tables: {
        orders: { data: { id: "o1", status: "pagado", total: "199.90" }, error: null },
        order_items: {
          data: [{ id: "oi1", order_id: "o1", price_snapshot: "99.95", quantity: 2 }],
          error: null,
        },
      },
    });

    const order = await getOrderById("o1", supabase as never);
    expect(order.items[0].price_snapshot).toBe(99.95);
  });

  it("propaga el error del pedido", async () => {
    const boom = new Error("no encontrado");
    const supabase = createSupabaseMock({ tables: { orders: { data: null, error: boom } } });
    await expect(getOrderById("o1", supabase as never)).rejects.toBe(boom);
  });

  it("propaga el error de los items", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      tables: {
        orders: { data: { id: "o1", status: "pagado", total: "0" }, error: null },
        order_items: { data: null, error: boom },
      },
    });
    await expect(getOrderById("o1", supabase as never)).rejects.toBe(boom);
  });
});
