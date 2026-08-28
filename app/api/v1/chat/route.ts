import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ask } from "@/services/chat.service";
import { apiError } from "@/lib/api-response";
import { CHAT_QUERY_MAX_CHARS } from "@/lib/constants/ai";
import type { ChatMode } from "@/types/chat";

const VALID_MODES: ChatMode[] = ["compras", "soporte"];

// Cliente de SESIÓN (no admin): la búsqueda debe respetar la RLS de
// knowledge_embeddings (solo authenticated — decisión 1).
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError(401, "unauthorized", "Necesitas iniciar sesión.");
  }

  let body: { query?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_body", "El cuerpo debe ser JSON válido.");
  }

  const query = body.query?.trim();
  if (!query) {
    return apiError(400, "invalid_query", "La consulta no puede estar vacía.");
  }
  if (query.length > CHAT_QUERY_MAX_CHARS) {
    return apiError(400, "query_too_long", `La consulta supera los ${CHAT_QUERY_MAX_CHARS} caracteres.`);
  }
  if (!body.mode || !VALID_MODES.includes(body.mode as ChatMode)) {
    return apiError(422, "invalid_mode", "mode debe ser 'compras' o 'soporte'.");
  }

  try {
    const result = await ask(query, body.mode as ChatMode, supabase);
    console.log(
      `[chat] mode=${body.mode} retrievedCount=${result.metadata.retrievedCount} ` +
        `usedSourceCount=${result.metadata.usedSourceCount} hasRelevantContext=${result.hasRelevantContext}`,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.warn(`[chat] falló: ${(err as Error).message}`);
    return apiError(500, "chat_failed", (err as Error).message);
  }
}
