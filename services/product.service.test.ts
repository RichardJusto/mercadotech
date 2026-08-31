import { describe, expect, it } from "vitest";
import { listActiveProducts } from "@/services/product.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";

function rawProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Laptop Dell XPS 13",
    price: "4299.00",
    condition: "nuevo",
    product_images: [
      { image_path: "sellers/p1/2.jpg", position: 1 },
      { image_path: "sellers/p1/1.jpg", position: 0 },
    ],
    reviews: [{ rating: 4 }, { rating: 5 }],
    ...overrides,
  };
}

describe("product.service.listActiveProducts — mapeo", () => {
  it("mapea price de string a number, la portada es la de menor position y calcula el rating promedio", async () => {
    const supabase = createSupabaseMock({
      tables: {
        products: { data: [rawProduct()], error: null, count: 1 },
      },
    });

    const result = await listActiveProducts({}, supabase as never);

    expect(result.total).toBe(1);
    expect(result.items[0].price).toBe(4299);
    expect(result.items[0].image_url).toContain("sellers/p1/1.jpg");
    expect(result.items[0].average_rating).toBe(4.5);
    expect(result.items[0].review_count).toBe(2);
  });

  it("producto sin reviews: promedio 0 y review_count 0", async () => {
    const supabase = createSupabaseMock({
      tables: {
        products: { data: [rawProduct({ reviews: [] })], error: null, count: 1 },
      },
    });

    const result = await listActiveProducts({}, supabase as never);
    expect(result.items[0].average_rating).toBe(0);
    expect(result.items[0].review_count).toBe(0);
  });
});

describe("product.service.listActiveProducts — construcción de la query", () => {
  it("sin filtros: solo is_active=true, orden 'recientes' por defecto y la primera página", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null, count: 0 } },
    });

    await listActiveProducts({}, supabase as never);

    const query = supabase.from.mock.results[0].value;
    expect(supabase.from).toHaveBeenCalledWith("products");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(0, PRODUCTS_PAGE_SIZE - 1);
  });

  it("categorySlug: busca el id por slug antes de filtrar productos", async () => {
    const supabase = createSupabaseMock({
      tables: {
        categories: { data: { id: "cat-laptops" }, error: null },
        products: { data: [], error: null, count: 0 },
      },
    });

    await listActiveProducts({ categorySlug: "laptops" }, supabase as never);

    const categoriesQuery = supabase.from.mock.results[0].value;
    expect(categoriesQuery.eq).toHaveBeenCalledWith("slug", "laptops");

    const productsQuery = supabase.from.mock.results[1].value;
    expect(productsQuery.eq).toHaveBeenCalledWith("category_id", "cat-laptops");
  });

  it("propaga el error si la categoría no existe", async () => {
    const boom = new Error("no encontrada");
    const supabase = createSupabaseMock({
      tables: { categories: { data: null, error: boom } },
    });

    await expect(
      listActiveProducts({ categorySlug: "no-existe" }, supabase as never),
    ).rejects.toBe(boom);
  });

  it("condition: filtra con .in cuando se pasan condiciones", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null, count: 0 } },
    });

    await listActiveProducts({ condition: ["nuevo", "usado"] }, supabase as never);

    const query = supabase.from.mock.results[0].value;
    expect(query.in).toHaveBeenCalledWith("condition", ["nuevo", "usado"]);
  });

  it("minPrice/maxPrice: filtra con .gte y .lte", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null, count: 0 } },
    });

    await listActiveProducts({ minPrice: 100, maxPrice: 500 }, supabase as never);

    const query = supabase.from.mock.results[0].value;
    expect(query.gte).toHaveBeenCalledWith("price", 100);
    expect(query.lte).toHaveBeenCalledWith("price", 500);
  });

  it("search: filtra con .or sobre title y brand", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null, count: 0 } },
    });

    await listActiveProducts({ search: "laptop" }, supabase as never);

    const query = supabase.from.mock.results[0].value;
    expect(query.or).toHaveBeenCalledWith("title.ilike.%laptop%,brand.ilike.%laptop%");
  });

  it.each([
    ["precio_asc", { ascending: true }],
    ["precio_desc", { ascending: false }],
  ] as const)("sort=%s ordena por price con ascending=%o", async (sort, expected) => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null, count: 0 } },
    });

    await listActiveProducts({ sort }, supabase as never);

    const query = supabase.from.mock.results[0].value;
    expect(query.order).toHaveBeenCalledWith("price", expected);
  });

  it("page > 1: calcula el rango correcto", async () => {
    const supabase = createSupabaseMock({
      tables: { products: { data: [], error: null, count: 0 } },
    });

    await listActiveProducts({ page: 3 }, supabase as never);

    const query = supabase.from.mock.results[0].value;
    const from = 2 * PRODUCTS_PAGE_SIZE;
    expect(query.range).toHaveBeenCalledWith(from, from + PRODUCTS_PAGE_SIZE - 1);
  });

  it("propaga el error de la consulta de productos", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({
      tables: { products: { data: null, error: boom } },
    });

    await expect(listActiveProducts({}, supabase as never)).rejects.toBe(boom);
  });
});
