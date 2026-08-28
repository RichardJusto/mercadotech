import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SupportTicket } from "@/types/ticket";

type Client = SupabaseClient<Database>;

// Solo lectura (decisión 5): crear tickets desde la UI llega con el agente
// de la sesión 8. Acá el chat de soporte solo SUGIERE crear uno cuando no
// tiene información — no lo crea.
export async function listMine(
  userId: string,
  supabase: Client = createClient(),
): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SupportTicket[];
}
