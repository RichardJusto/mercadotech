import { describe, expect, it } from "vitest";
import {
  listMyProducts,
  updateOrderStatus,
  createProduct,
  updateProduct,
  toggleActive,
  deleteProduct,
  listMyOrders,
  type ProductInput,
} from "@/services/seller.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

const productInput: ProductInput = {
  categoryId: "cat-1",
  title: "Producto",
  condition: "nuevo",
  price: 100,
  stock: 5,
};

describe("seller.service.listMyProducts", () => {
  it("no filtra por is_active: incluye inactivos (solo filtra por seller_id)", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null } },
    });

    await listMyProducts("seller-1", supabase as never);

    const query = supabase.from.mock.results[0].value;
    expect(query.eq).toHaveBeenCalledWith("seller_id", "seller-1");
    expect(query.eq).not.toHaveBeenCalledWith("is_active", expect.anything());
  });
});

// Nota de la Sesión 6 (hallazgo, no bug): la spec asumía que la secuencia de
// transición del kanban vivía en un helper de módulo sin exportar en
// hooks/useSellerOrders.ts (Estado de partida, fila "Regla del kanban").
// Al leer el código real, esa validación se MOVIÓ a
// services/seller.service.ts::updateOrderStatus — el propio comentario del
// archivo lo documenta ("Antes esta validación SOLO vivía en el hook... se
// movió acá"), evolución posterior a la fecha de la spec (2026-08-28). No
// existe ningún helper de hook que exportar: no se creó
// hooks/useSellerOrders.test.ts porque no hay lógica de negocio en el hook
// para testear sin React — está SOLO acá, testeada con el mock de Supabase
// como cualquier otro service, sin necesidad de renderHook.
describe("seller.service.updateOrderStatus — secuencia del kanban", () => {
  const casosValidos: [string, string][] = [
    ["pendiente", "pagado"],
    ["pagado", "enviado"],
    ["enviado", "entregado"],
  ];

  it.each(casosValidos)("permite el paso válido %s -> %s", async (from, to) => {
    const supabase = createSupabaseMock({
      tables: {
        orders: [{ data: { status: from }, error: null }, { data: null, error: null }],
      },
    });

    await updateOrderStatus("order-1", to as never, supabase as never);

    const updateQuery = supabase.from.mock.results[1].value;
    expect(updateQuery.update).toHaveBeenCalledWith({ status: to });
  });

  const casosInvalidos: [string, string, string][] = [
    ["salto hacia adelante", "pendiente", "enviado"],
    ["retrocede un paso", "pagado", "pendiente"],
    ["cancelado no se reactiva (como origen)", "cancelado", "pendiente"],
    ["cancelado no es destino del vendedor", "pendiente", "cancelado"],
  ];

  it.each(casosInvalidos)("rechaza: %s (%s -> %s)", async (_desc, from, to) => {
    const supabase = createSupabaseMock({
      tables: { orders: { data: { status: from }, error: null } },
    });

    await expect(updateOrderStatus("order-1", to as never, supabase as never)).rejects.toThrow(
      "Solo puedes avanzar el pedido un paso a la vez.",
    );
  });

  it("rechaza un estado actual desconocido (no está en el flujo)", async () => {
    const supabase = createSupabaseMock({
      tables: { orders: { data: { status: "estado-inventado" }, error: null } },
    });

    await expect(
      updateOrderStatus("order-1", "pagado" as never, supabase as never),
    ).rejects.toThrow("Solo puedes avanzar el pedido un paso a la vez.");
  });

  it("propaga el error si no puede leer el pedido actual", async () => {
    const boom = new Error("no encontrado");
    const supabase = createSupabaseMock({
      tables: { orders: { data: null, error: boom } },
    });

    await expect(updateOrderStatus("order-1", "pagado" as never, supabase as never)).rejects.toBe(
      boom,
    );
  });

  it("propaga el error del update cuando la transición sí es válida", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      tables: {
        orders: [{ data: { status: "pendiente" }, error: null }, { data: null, error: boom }],
      },
    });

    await expect(updateOrderStatus("order-1", "pagado" as never, supabase as never)).rejects.toBe(
      boom,
    );
  });
});

describe("seller.service.createProduct / updateProduct / toggleActive", () => {
  it("createProduct: inserta con seller_id y devuelve el id", async () => {
    const supabase = createSupabaseMock({ tables: { products: { data: { id: "p1" }, error: null } } });
    const result = await createProduct("seller-1", productInput, supabase as never);
    expect(result).toEqual({ id: "p1" });
    const query = supabase.from.mock.results[0].value;
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ seller_id: "seller-1" }));
  });

  it("createProduct: propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { products: { data: null, error: boom } } });
    await expect(createProduct("seller-1", productInput, supabase as never)).rejects.toBe(boom);
  });

  it("updateProduct: actualiza por id", async () => {
    const supabase = createSupabaseMock({ tables: { products: { data: null, error: null } } });
    await updateProduct("p1", productInput, supabase as never);
    const query = supabase.from.mock.results[0].value;
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ title: "Producto" }));
    expect(query.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("updateProduct: propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { products: { data: null, error: boom } } });
    await expect(updateProduct("p1", productInput, supabase as never)).rejects.toBe(boom);
  });

  it("toggleActive: activa/desactiva por id", async () => {
    const supabase = createSupabaseMock({ tables: { products: { data: null, error: null } } });
    await toggleActive("p1", false, supabase as never);
    const query = supabase.from.mock.results[0].value;
    expect(query.update).toHaveBeenCalledWith({ is_active: false });
  });
});

describe("seller.service.deleteProduct", () => {
  it("caso feliz: elimina el producto", async () => {
    const supabase = createSupabaseMock({ tables: { products: { data: null, error: null } } });
    await expect(deleteProduct("p1", supabase as never)).resolves.toBeUndefined();
  });

  it("traduce el error 23503 (tiene ventas) a un mensaje accionable", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: null, error: { code: "23503" } } },
    });
    await expect(deleteProduct("p1", supabase as never)).rejects.toThrow(
      "Este producto tiene ventas; desactívalo en lugar de eliminarlo.",
    );
  });

  it("propaga cualquier otro error tal cual", async () => {
    const boom = { code: "OTRO", message: "fallo de red" };
    const supabase = createSupabaseMock({ tables: { products: { data: null, error: boom } } });
    await expect(deleteProduct("p1", supabase as never)).rejects.toBe(boom);
  });
});

describe("seller.service.listMyOrders", () => {
  it("agrupa por pedido: solo suma los ítems de ESTE vendedor, no orders.total completo", async () => {
    const supabase = createSupabaseMock({
      tables: {
        order_items: {
          data: [
            {
              id: "oi1",
              title_snapshot: "Producto A",
              price_snapshot: "50.00",
              quantity: 1,
              orders: { id: "o1", status: "pagado", total: "500.00", created_at: "2026-01-02" },
            },
            {
              id: "oi2",
              title_snapshot: "Producto B",
              price_snapshot: "30.00",
              quantity: 2,
              orders: { id: "o1", status: "pagado", total: "500.00", created_at: "2026-01-02" },
            },
          ],
          error: null,
        },
      },
    });

    const orders = await listMyOrders("seller-1", supabase as never);

    expect(orders).toHaveLength(1);
    expect(orders[0].items).toHaveLength(2);
    expect(orders[0].total).toBe(500);
  });

  it("descarta filas sin pedido asociado (orders null)", async () => {
    const supabase = createSupabaseMock({
      tables: {
        order_items: {
          data: [{ id: "oi1", title_snapshot: "X", price_snapshot: "1", quantity: 1, orders: null }],
          error: null,
        },
      },
    });

    const orders = await listMyOrders("seller-1", supabase as never);
    expect(orders).toEqual([]);
  });

  it("ordena por created_at descendente", async () => {
    const supabase = createSupabaseMock({
      tables: {
        order_items: {
          data: [
            {
              id: "oi1",
              title_snapshot: "A",
              price_snapshot: "1",
              quantity: 1,
              orders: { id: "o1", status: "pagado", total: "1", created_at: "2026-01-01" },
            },
            {
              id: "oi2",
              title_snapshot: "B",
              price_snapshot: "1",
              quantity: 1,
              orders: { id: "o2", status: "pagado", total: "1", created_at: "2026-01-05" },
            },
          ],
          error: null,
        },
      },
    });

    const orders = await listMyOrders("seller-1", supabase as never);
    expect(orders.map((o) => o.id)).toEqual(["o2", "o1"]);
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { order_items: { data: null, error: boom } } });
    await expect(listMyOrders("seller-1", supabase as never)).rejects.toBe(boom);
  });
});
