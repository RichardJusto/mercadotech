import { describe, expect, it } from "vitest";
import { addItem, getItems, updateQuantity, removeItem, clear } from "@/services/cart.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

describe("cart.service.addItem", () => {
  it("producto nuevo (sin ítem existente): inserta con la cantidad pedida", async () => {
    const supabase = createSupabaseMock({
      tables: {
        products: { data: { stock: 10 }, error: null },
        cart_items: [{ data: null, error: null }],
      },
    });

    await addItem("user-1", "prod-1", 2, supabase as never);

    // .from("products") -> índice 0; .from("cart_items") SELECT -> índice 1;
    // .from("cart_items") UPDATE/INSERT -> índice 2 (query nueva, cadena distinta).
    const cartItemsWriteQuery = supabase.from.mock.results[2].value;
    expect(cartItemsWriteQuery.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      product_id: "prod-1",
      quantity: 2,
    });
  });

  it("producto duplicado: SUMA la cantidad nueva a la existente", async () => {
    const supabase = createSupabaseMock({
      tables: {
        products: { data: { stock: 10 }, error: null },
        cart_items: [{ data: { id: "ci-1", quantity: 3 }, error: null }],
      },
    });

    await addItem("user-1", "prod-1", 2, supabase as never);

    // .from("products") -> índice 0; .from("cart_items") SELECT -> índice 1;
    // .from("cart_items") UPDATE/INSERT -> índice 2 (query nueva, cadena distinta).
    const cartItemsWriteQuery = supabase.from.mock.results[2].value;
    expect(cartItemsWriteQuery.update).toHaveBeenCalledWith({ quantity: 5 });
  });

  it("recorta el resultado al stock disponible (tope superior)", async () => {
    const supabase = createSupabaseMock({
      tables: {
        products: { data: { stock: 5 }, error: null },
        cart_items: [{ data: { id: "ci-1", quantity: 3 }, error: null }],
      },
    });

    await addItem("user-1", "prod-1", 10, supabase as never);

    // .from("products") -> índice 0; .from("cart_items") SELECT -> índice 1;
    // .from("cart_items") UPDATE/INSERT -> índice 2 (query nueva, cadena distinta).
    const cartItemsWriteQuery = supabase.from.mock.results[2].value;
    expect(cartItemsWriteQuery.update).toHaveBeenCalledWith({ quantity: 5 });
  });

  // comportamiento actual, revisar: el código real (services/cart.service.ts)
  // solo recorta hacia arriba con Math.min(..., stock) — NO hay ningún
  // Math.max(1, ...) que pise la cantidad a un mínimo de 1. Con quantity=0 y
  // sin ítem existente, inserta una fila con quantity=0. Documentado en la
  // bitácora de la Sesión 6; no se corrige acá (decisión 5: el test ancla al
  // contrato real, no al deseado).
  it("sin piso mínimo: quantity=0 sin ítem existente inserta quantity=0", async () => {
    const supabase = createSupabaseMock({
      tables: {
        products: { data: { stock: 10 }, error: null },
        cart_items: [{ data: null, error: null }],
      },
    });

    await addItem("user-1", "prod-1", 0, supabase as never);

    // .from("products") -> índice 0; .from("cart_items") SELECT -> índice 1;
    // .from("cart_items") UPDATE/INSERT -> índice 2 (query nueva, cadena distinta).
    const cartItemsWriteQuery = supabase.from.mock.results[2].value;
    expect(cartItemsWriteQuery.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      product_id: "prod-1",
      quantity: 0,
    });
  });

  it("propaga el error de lectura del producto tal cual", async () => {
    const boom = new Error("producto no encontrado");
    const supabase = createSupabaseMock({
      tables: {
        products: { data: null, error: boom },
      },
    });

    await expect(addItem("user-1", "prod-1", 1, supabase as never)).rejects.toBe(boom);
  });

  it("propaga el error de lectura del carrito tal cual", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      tables: {
        products: { data: { stock: 10 }, error: null },
        cart_items: { data: null, error: boom },
      },
    });

    await expect(addItem("user-1", "prod-1", 1, supabase as never)).rejects.toBe(boom);
  });
});

describe("cart.service.getItems", () => {
  it("mapea el producto y su portada; null si el producto quedó inactivo (RLS lo oculta)", async () => {
    const supabase = createSupabaseMock({
      tables: {
        cart_items: {
          data: [
            {
              id: "ci-1",
              product_id: "p1",
              quantity: 2,
              products: {
                id: "p1",
                title: "Laptop",
                price: "100.00",
                stock: 5,
                product_images: [
                  { image_path: "a/2.jpg", position: 1 },
                  { image_path: "a/1.jpg", position: 0 },
                ],
              },
            },
            { id: "ci-2", product_id: "p2", quantity: 1, products: null },
          ],
          error: null,
        },
      },
    });

    const items = await getItems("user-1", supabase as never);

    expect(items[0].product).toMatchObject({ id: "p1", price: 100 });
    expect(items[0].product?.image_url).toContain("a/1.jpg");
    expect(items[1].product).toBeNull();
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: boom } } });
    await expect(getItems("user-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("cart.service.updateQuantity / removeItem / clear", () => {
  it("updateQuantity: actualiza la cantidad del ítem", async () => {
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: null } } });
    await updateQuantity("ci-1", 3, supabase as never);
    const query = supabase.from.mock.results[0].value;
    expect(query.update).toHaveBeenCalledWith({ quantity: 3 });
    expect(query.eq).toHaveBeenCalledWith("id", "ci-1");
  });

  it("updateQuantity: propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: boom } } });
    await expect(updateQuantity("ci-1", 3, supabase as never)).rejects.toBe(boom);
  });

  it("removeItem: elimina el ítem por id", async () => {
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: null } } });
    await removeItem("ci-1", supabase as never);
    const query = supabase.from.mock.results[0].value;
    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("id", "ci-1");
  });

  it("removeItem: propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: boom } } });
    await expect(removeItem("ci-1", supabase as never)).rejects.toBe(boom);
  });

  it("clear: vacía el carrito del usuario", async () => {
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: null } } });
    await clear("user-1", supabase as never);
    const query = supabase.from.mock.results[0].value;
    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("clear: propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { cart_items: { data: null, error: boom } } });
    await expect(clear("user-1", supabase as never)).rejects.toBe(boom);
  });
});
