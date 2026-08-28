import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type SupportArticle = Database["public"]["Tables"]["support_articles"]["Row"];

// No existe un service para support_articles: la web solo los consume vía
// indexación/RAG (embedding.service, chat.service), nunca los lista
// directo. Se deriva un SELECT simple sobre una tabla con grant público
// (anon/authenticated, ver supabase/schema.sql) en vez de crear un service
// nuevo para una lectura sin transformación de negocio (decisión 6).
export async function listPublishedArticles(supabase: Client): Promise<SupportArticle[]> {
  const { data, error } = await supabase
    .from("support_articles")
    .select("*")
    .eq("is_published", true)
    .order("category", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getArticleById(
  id: string,
  supabase: Client,
): Promise<SupportArticle | null> {
  const { data, error } = await supabase
    .from("support_articles")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
