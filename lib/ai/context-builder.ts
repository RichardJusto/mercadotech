import { buildRagUserMessage } from "@/lib/ai/prompts";
import {
  CONTEXT_BUILDER_DEFAULT_MAX_SOURCES,
  CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY,
  CONTEXT_BUILDER_MIN_CONTENT_LENGTH,
  CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS,
  CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS,
} from "@/lib/constants/ai";

export interface RetrievedSource {
  source_type: "producto" | "articulo_soporte";
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface ContextSource {
  source_type: "producto" | "articulo_soporte";
  source_id: string;
  title: string;
  similarity: number;
  // Solo presentes en fuentes 'producto' (metadata las trae desde el
  // indexado — ver embedding.service.ts): la UI arma la mini-card de la
  // fuente sin otra consulta.
  price?: number;
  image_url?: string | null;
  // Solo presente en fuentes 'articulo_soporte'.
  category?: string;
}

export interface ContextBuilderOptions {
  maxSources?: number;
  minSimilarity?: number;
  maxContextChars?: number;
}

export interface BuildContextResult {
  userMessage: string;
  sources: ContextSource[];
  stats: {
    contextTruncated: boolean;
    totalChars: number;
  };
}

function sourceTitle(source: RetrievedSource): string {
  const title = source.metadata.title;
  return typeof title === "string" ? title : "Sin título";
}

function toContextSource(source: RetrievedSource): ContextSource {
  const { metadata } = source;
  const base: ContextSource = {
    source_type: source.source_type,
    source_id: source.source_id,
    title: sourceTitle(source),
    similarity: source.similarity,
  };

  if (source.source_type === "producto") {
    return {
      ...base,
      price: typeof metadata.price === "number" ? metadata.price : undefined,
      image_url: typeof metadata.image_url === "string" ? metadata.image_url : null,
    };
  }

  return { ...base, category: typeof metadata.category === "string" ? metadata.category : undefined };
}

// Función PURA (cero red, cero Supabase, cero React — ver Fase 4.5 de
// MercadoTech_sesion4.md): el "criterio del bibliotecario" sobre qué fichas
// recuperadas entran de verdad al contexto del LLM, en qué orden y sin
// pasarse del espacio disponible.
export function buildContext(
  query: string,
  results: RetrievedSource[],
  opts: ContextBuilderOptions = {},
): BuildContextResult {
  const {
    maxSources = CONTEXT_BUILDER_DEFAULT_MAX_SOURCES,
    minSimilarity = CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY,
    maxContextChars = CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS,
  } = opts;

  // 1. Selección: umbral de similitud + contenido mínimo, mejor similitud
  // primero, tope de fuentes.
  const candidates = results
    .filter(
      (r) => r.similarity >= minSimilarity && r.content.length >= CONTEXT_BUILDER_MIN_CONTENT_LENGTH,
    )
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSources);

  // 2. Presupuesto: se acumula en orden de relevancia hasta maxContextChars.
  // La fuente que no entra completa se trunca SOLO si el espacio que le
  // queda alcanza CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS; si no, se
  // descarta entera y ahí termina la acumulación (las siguientes son menos
  // relevantes que la descartada, así que tampoco tendría sentido colarlas).
  const included: RetrievedSource[] = [];
  let totalChars = 0;
  let contextTruncated = false;

  for (const candidate of candidates) {
    const remaining = maxContextChars - totalChars;
    if (remaining <= 0) {
      contextTruncated = true;
      break;
    }

    if (candidate.content.length <= remaining) {
      included.push(candidate);
      totalChars += candidate.content.length;
      continue;
    }

    if (remaining >= CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS) {
      const truncatedContent = candidate.content.slice(0, remaining);
      included.push({ ...candidate, content: truncatedContent });
      totalChars += truncatedContent.length;
    }
    contextTruncated = true;
    break;
  }

  const userMessage = buildRagUserMessage(
    query,
    included.map((source, i) => ({ index: i + 1, content: source.content })),
  );

  const sources: ContextSource[] = included.map(toContextSource);

  return { userMessage, sources, stats: { contextTruncated, totalChars } };
}
