import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ChatMode, ChatResult } from "@/types/chat";
import { searchKnowledge } from "@/services/vector-search.service";
import { buildContext } from "@/lib/ai/context-builder";
import { generateCompletion } from "@/lib/ai/completion";
import { SHOPPING_SYSTEM_INSTRUCTIONS, SUPPORT_SYSTEM_INSTRUCTIONS } from "@/lib/ai/prompts";

type Client = SupabaseClient<Database>;

const MODE_SOURCE_TYPE = {
  compras: "producto",
  soporte: "articulo_soporte",
} as const;

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  compras: SHOPPING_SYSTEM_INSTRUCTIONS,
  soporte: SUPPORT_SYSTEM_INSTRUCTIONS,
};

// Orquesta la tubería completa SIN reimplementar nada de las capas dueñas:
// vector-search (RPC, filtrado por source_type según el modo) -> context-
// builder (selección + presupuesto, puro) -> lib/ai/completion (redacción).
// Si algo nuevo hiciera falta, se agrega en la capa dueña, no acá.
export async function ask(
  query: string,
  mode: ChatMode,
  supabase: Client,
): Promise<ChatResult> {
  const matches = await searchKnowledge(query, { sourceType: MODE_SOURCE_TYPE[mode] }, supabase);
  const { userMessage, sources, stats } = buildContext(query, matches);
  const completion = await generateCompletion(MODE_INSTRUCTIONS[mode], userMessage);

  return {
    query,
    answer: completion.text,
    hasRelevantContext: sources.length > 0,
    sources,
    metadata: {
      model: completion.model,
      retrievedCount: matches.length,
      usedSourceCount: sources.length,
      contextTruncated: stats.contextTruncated,
    },
  };
}
