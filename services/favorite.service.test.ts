import { describe, expect, it } from "vitest";
import { isFavorite, toggle, listMine } from "@/services/favorite.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

describe("favorite.service.isFavorite", () => {
  it("true cuando existe la fila", async () => {
    const supabase = createSupabaseMock({ tables: { favorites: { data: { id: "f1" }, error: null } } });
    await expect(isFavorite("prod-1", "user-1", supabase as never)).resolves.toBe(true);
  });

  it("false cuando no existe", async () => {
    const supabase = createSupabaseMock({ tables: { favorites: { data: null, error: null } } });
    await expect(isFavorite("prod-1", "user-1", supabase as never)).resolves.toBe(false);
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { favorites: { data: null, error: boom } } });
    await expect(isFavorite("prod-1", "user-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("favorite.service.toggle", () => {
  it("si ya era favorito, lo borra y devuelve false", async () => {
    const supabase = createSupabaseMock({
      tables: {
        favorites: [
          { data: { id: "f1" }, error: null }, // isFavorite: sí existe
          { data: null, error: null }, // delete
        ],
      },
    });

    await expect(toggle("prod-1", "user-1", supabase as never)).resolves.toBe(false);
    const deleteQuery = supabase.from.mock.results[1].value;
    expect(deleteQuery.delete).toHaveBeenCalled();
  });

  it("si no era favorito, lo inserta y devuelve true", async () => {
    const supabase = createSupabaseMock({
      tables: {
        favorites: [
          { data: null, error: null }, // isFavorite: no existe
          { data: null, error: null }, // insert
        ],
      },
    });

    await expect(toggle("prod-1", "user-1", supabase as never)).resolves.toBe(true);
    const insertQuery = supabase.from.mock.results[1].value;
    expect(insertQuery.insert).toHaveBeenCalledWith({ product_id: "prod-1", user_id: "user-1" });
  });
});

describe("favorite.service.listMine", () => {
  it("sin sesión: devuelve lista vacía sin consultar favorites", async () => {
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });

    await expect(listMine(supabase as never)).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("caso feliz: descarta productos null y mapea el resto", async () => {
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      tables: {
        favorites: {
          data: [
            { product_id: "p1", products: null },
            {
              product_id: "p2",
              products: {
                id: "p2",
                title: "Producto",
                price: "10.00",
                condition: "nuevo",
                product_images: [],
                reviews: [],
              },
            },
          ],
          error: null,
        },
      },
    });

    const result = await listMine(supabase as never);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p2");
  });

  it("propaga el error de la consulta", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
      tables: { favorites: { data: null, error: boom } },
    });

    await expect(listMine(supabase as never)).rejects.toBe(boom);
  });
});
