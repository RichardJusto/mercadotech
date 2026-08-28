import { InferenceClient } from "@huggingface/inference";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_DEFAULT,
  MAX_EMBEDDING_INPUT_CHARS,
} from "@/lib/constants/ai";

function getClient(): InferenceClient {
  const token = process.env.HUGGINGFACEHUB_API_TOKEN;
  if (!token) {
    throw new Error("HUGGINGFACEHUB_API_TOKEN no está configurada.");
  }
  return new InferenceClient(token);
}

// Único lugar del proyecto que genera embeddings. SOLO con el SDK oficial
// (Guía HF, lección 1): Hugging Face documenta que feature-extraction no
// está disponible en el router OpenAI-compatible; un fetch directo falla.
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getClient();
  const model = process.env.HUGGINGFACE_EMBEDDING_MODEL || EMBEDDING_MODEL_DEFAULT;

  let result: unknown;
  try {
    result = await client.featureExtraction({ model, inputs: text });
  } catch (err) {
    throw new Error(`No se pudo generar el embedding: ${(err as Error).message}`);
  }

  // all-MiniLM-L6-v2 devuelve un vector plano de 384 números; otros modelos
  // devuelven una matriz por token (number[][]). Se valida la forma exacta
  // y se RECHAZA cualquier otra cosa (lección 5) — mejor un error claro que
  // una fila corrupta en knowledge_embeddings.
  if (
    !Array.isArray(result) ||
    result.length !== EMBEDDING_DIMENSIONS ||
    !result.every((n) => typeof n === "number")
  ) {
    throw new Error(
      `El proveedor devolvió un vector con forma inesperada (se esperaba un array ` +
        `plano de ${EMBEDDING_DIMENSIONS} números). Si el modelo de embeddings cambió, ` +
        `revisa HUGGINGFACE_EMBEDDING_MODEL.`,
    );
  }

  return result;
}

interface ProductForEmbedding {
  title: string;
  brand: string | null;
  condition: string;
  description: string | null;
}

// Secciones etiquetadas, de mayor a menor densidad semántica; el contenido
// largo (descripción) va al final y todo se trunca a MAX_EMBEDDING_INPUT_CHARS
// (lección 4: MiniLM trunca en silencio, que se pierda lo menos importante).
export function buildProductEmbeddingText(
  product: ProductForEmbedding,
  categoryName: string,
): string {
  const parts = [
    `Título: ${product.title}`,
    product.brand ? `Marca: ${product.brand}` : null,
    `Categoría: ${categoryName}`,
    `Condición: ${product.condition}`,
    product.description ? `Descripción: ${product.description}` : null,
  ].filter((part): part is string => part !== null);

  return parts.join("\n").slice(0, MAX_EMBEDDING_INPUT_CHARS);
}

interface SupportArticleForEmbedding {
  title: string;
  category: string | null;
  content: string;
}

export function buildSupportArticleEmbeddingText(
  article: SupportArticleForEmbedding,
): string {
  const parts = [
    `Título: ${article.title}`,
    article.category ? `Categoría: ${article.category}` : null,
    `Contenido: ${article.content}`,
  ].filter((part): part is string => part !== null);

  return parts.join("\n").slice(0, MAX_EMBEDDING_INPUT_CHARS);
}
