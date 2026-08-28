import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { searchProducts } from "@/services/vector-search.service";
import { apiError } from "@/lib/api-response";
import { CHAT_QUERY_MAX_CHARS } from "@/lib/constants/ai";

// El embedding de la consulta se genera acá (server-only): el token de
// Hugging Face no puede viajar al navegador. El RPC corre con el cliente de
// SESIÓN (no admin) para que la RLS de `knowledge_embeddings` (solo
// `authenticated`) siga aplicando (decisión 1).
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError(401, "unauthorized", "Necesitas iniciar sesión para usar la búsqueda inteligente.");
  }

  let body: { query?: string };
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

  try {
    const results = await searchProducts(query, {}, supabase);
    return NextResponse.json({ results });
  } catch (err) {
    console.warn(`[search/semantic] falló: ${(err as Error).message}`);
    return apiError(500, "search_failed", (err as Error).message);
  }
}
