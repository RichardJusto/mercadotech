import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAllActiveProducts } from "./products";

type Client = SupabaseClient<Database>;

export interface SellerProfile {
  id: string;
  displayName: string;
  activeProducts: {
    id: string;
    title: string;
    price: number;
  }[];
}

// profiles NO tiene SELECT público (deuda documentada de la Sesión 3: no
// existe una vista public_profiles) — se usa cliente ADMIN (decisión 5) y
// se expone SOLO display_name + sus productos activos. JAMÁS phone, email
// ni role: ese es precisamente el dato que profiles no comparte con
// anon/otros usuarios por diseño.
export async function getSellerProfile(
  sellerId: string,
  admin: Client,
): Promise<SellerProfile | null> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", sellerId)
    .eq("role", "seller")
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const items = await getAllActiveProducts(admin);
  const activeProducts = items
    .filter((p) => p.seller_id === sellerId)
    .map((p) => ({ id: p.id, title: p.title, price: p.price }));

  return {
    id: profile.id,
    displayName: profile.display_name ?? "Vendedor",
    activeProducts,
  };
}

// Para el callback `list` del resource template (lección 7 / patrón
// ReadHub): todos los vendedores con al menos un producto activo, para
// que cada instancia real aparezca en resources/list.
export async function listSellersWithActiveProducts(
  admin: Client,
): Promise<{ id: string; displayName: string }[]> {
  const { data: sellers, error } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("role", "seller");
  if (error) throw error;

  const items = await getAllActiveProducts(admin);
  const sellersWithProducts = new Set(items.map((p) => p.seller_id));

  return (sellers ?? [])
    .filter((s) => sellersWithProducts.has(s.id))
    .map((s) => ({ id: s.id, displayName: s.display_name ?? "Vendedor" }));
}
