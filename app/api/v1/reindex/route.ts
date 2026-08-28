import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexSource, type KnowledgeSourceType } from "@/services/embedding.service";
import { apiError } from "@/lib/api-response";

const VALID_SOURCE_TYPES: KnowledgeSourceType[] = ["producto", "articulo_soporte"];

// Solo exige sesión (no verifica que el caller sea el dueño de la fuente):
// reindexar no modifica el producto/artículo, solo recalcula su ficha en
// knowledge_embeddings — el peor abuso posible es gastar cuota de Hugging
// Face, no comprometer datos. La sesión ya es la barrera pedida por la spec.
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError(401, "unauthorized", "Necesitas iniciar sesión.");
  }

  let body: { sourceType?: string; sourceId?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_body", "El cuerpo debe ser JSON válido.");
  }

  const { sourceType, sourceId } = body;
  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType as KnowledgeSourceType)) {
    return apiError(400, "invalid_source_type", "sourceType debe ser 'producto' o 'articulo_soporte'.");
  }
  if (!sourceId || typeof sourceId !== "string") {
    return apiError(400, "invalid_source_id", "sourceId es obligatorio.");
  }

  try {
    const admin = createAdminClient();
    const result = await indexSource(sourceType as KnowledgeSourceType, sourceId, admin);
    return NextResponse.json(result);
  } catch (err) {
    // El caller (triggerReindex) es fire-and-forget y solo loguea en la
    // consola del navegador de quien publicó — para poder diagnosticar
    // fallas de indexación (ej. token de IA no configurado) sin depender
    // de esa consola cliente, se deja constancia también en el server.
    console.warn(`[reindex] falló: ${(err as Error).message}`);
    return apiError(500, "reindex_failed", (err as Error).message);
  }
}
