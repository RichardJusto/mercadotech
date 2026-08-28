import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Question } from "@/types/question";

type Client = SupabaseClient<Database>;

// question.service.ts solo tiene listByProduct, no getById. Se deriva una
// lectura directa (no una consulta de negocio nueva) porque la política
// "questions_select_all" ya permite SELECT público a anon/authenticated
// (supabase/schema.sql) — es la misma tabla que listByProduct ya lee, solo
// filtrada por id en vez de product_id.
export async function getQuestionById(
  id: string,
  supabase: Client,
): Promise<Question | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
