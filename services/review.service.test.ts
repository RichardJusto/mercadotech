import { describe, expect, it } from "vitest";
import { canReview, create, listByProduct } from "@/services/review.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

describe("review.service.canReview", () => {
  it("false si ya existe una reseña del usuario para el producto", async () => {
    const supabase = createSupabaseMock({
      tables: { reviews: { data: { id: "rev-1" }, error: null } },
    });

    const result = await canReview("prod-1", "user-1", supabase as never);
    expect(result).toEqual({ allowed: false, orderId: null });
  });

  it("false sin pedido entregado con ese producto", async () => {
    const supabase = createSupabaseMock({
      tables: {
        reviews: { data: null, error: null },
        order_items: { data: null, error: null },
      },
    });

    const result = await canReview("prod-1", "user-1", supabase as never);
    expect(result).toEqual({ allowed: false, orderId: null });
  });

  it("true con {allowed, orderId} cuando hay un pedido entregado y sin reseña previa", async () => {
    const supabase = createSupabaseMock({
      tables: {
        reviews: { data: null, error: null },
        order_items: { data: { order_id: "order-1" }, error: null },
      },
    });

    const result = await canReview("prod-1", "user-1", supabase as never);
    expect(result).toEqual({ allowed: true, orderId: "order-1" });
  });

  it("propaga el error de la consulta de reseñas", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { reviews: { data: null, error: boom } } });
    await expect(canReview("prod-1", "user-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("review.service.listByProduct", () => {
  it("caso feliz: devuelve las reseñas del producto", async () => {
    const rows = [{ id: "r1", rating: 5 }];
    const supabase = createSupabaseMock({ tables: { reviews: { data: rows, error: null } } });
    await expect(listByProduct("prod-1", supabase as never)).resolves.toBe(rows);
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { reviews: { data: null, error: boom } } });
    await expect(listByProduct("prod-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("review.service.create", () => {
  it("caso feliz: crea la reseña con el buyer_id de la sesión", async () => {
    const created = { id: "rev-1", rating: 5 };
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      tables: { reviews: { data: created, error: null } },
    });

    const result = await create(
      { productId: "prod-1", orderId: "order-1", rating: 5 },
      supabase as never,
    );
    expect(result).toBe(created);
  });

  it("rechaza sin sesión activa", async () => {
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });

    await expect(
      create({ productId: "prod-1", orderId: "order-1", rating: 5 }, supabase as never),
    ).rejects.toThrow("No hay sesión activa");
  });

  it("propaga el error del insert", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      tables: { reviews: { data: null, error: boom } },
    });

    await expect(
      create({ productId: "prod-1", orderId: "order-1", rating: 5 }, supabase as never),
    ).rejects.toBe(boom);
  });
});
