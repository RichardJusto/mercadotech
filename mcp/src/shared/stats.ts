import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { listCategories } from "@/services/category.service";
import { listActiveProducts } from "@/services/product.service";

type Client = SupabaseClient<Database>;

// Tunable propio del MCP (no aplica a la web, así que no vive en
// lib/constants/ de la raíz): cuántos "más vendidos" devuelve
// get_store_stats — suficiente para responder "¿qué se vende más?" sin
// convertir la tool en un reporte completo de ventas.
const TOP_SELLING_LIMIT = 5;

export interface CategoryProductCount {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface TopSellingProduct {
  productId: string;
  title: string;
  unitsSold: number;
}

export interface StoreStats {
  totalActiveProducts: number;
  categories: CategoryProductCount[];
  priceRange: { min: number; max: number } | null;
  topSelling: TopSellingProduct[];
}

// No existe un service de agregados/estadísticas (decisión 6). El conteo
// por categoría y el rango de precios se COMPONEN con listCategories +
// listActiveProducts (ya existentes, cliente anon): listActiveProducts ya
// devuelve `total` exacto por filtro, así que no hace falta traer items
// para contar. El "top vendidos" SÍ requiere una consulta nueva porque
// ningún service agrega order_items — se documenta acá mismo como
// derivación, con cliente ADMIN porque order_items no es legible por anon
// (decisión 4), excluyendo pedidos 'cancelado' para no contar ventas que
// no se concretaron. Nunca se expone nada del comprador, solo
// product_id/título/cantidad.
// Reutilizada sola por la tool list_categories (#3) y el resource
// mercadotech://categories, y compuesta también dentro de getStoreStats:
// un solo lugar para la derivación "categoría + cuántos productos activos
// tiene", sin repetirla.
export async function getCategoryCounts(anon: Client): Promise<CategoryProductCount[]> {
  const categories = await listCategories(anon);
  return Promise.all(
    categories.map(async (cat) => {
      const { total } = await listActiveProducts({ categorySlug: cat.slug }, anon);
      return { id: cat.id, name: cat.name, slug: cat.slug, productCount: total };
    }),
  );
}

export async function getStoreStats(anon: Client, admin: Client): Promise<StoreStats> {
  const [{ total: totalActiveProducts }, categoryCounts, ascPage, descPage] = await Promise.all([
    listActiveProducts({}, anon),
    getCategoryCounts(anon),
    listActiveProducts({ sort: "precio_asc" }, anon),
    listActiveProducts({ sort: "precio_desc" }, anon),
  ]);

  const priceRange =
    ascPage.items.length > 0 && descPage.items.length > 0
      ? { min: ascPage.items[0].price, max: descPage.items[0].price }
      : null;

  const { data: soldItems, error } = await admin
    .from("order_items")
    .select("product_id, title_snapshot, quantity, orders!inner(status)")
    .neq("orders.status", "cancelado");
  if (error) throw error;

  const byProduct = new Map<string, TopSellingProduct>();
  for (const item of soldItems ?? []) {
    const existing = byProduct.get(item.product_id);
    if (existing) {
      existing.unitsSold += item.quantity;
    } else {
      byProduct.set(item.product_id, {
        productId: item.product_id,
        title: item.title_snapshot,
        unitsSold: item.quantity,
      });
    }
  }
  const topSelling = [...byProduct.values()]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, TOP_SELLING_LIMIT);

  return { totalActiveProducts, categories: categoryCounts, priceRange, topSelling };
}
