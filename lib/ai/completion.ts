import { HUGGINGFACE_CHAT_MAX_TOKENS, HUGGINGFACE_CHAT_MODEL_DEFAULT } from "@/lib/constants/ai";

export interface CompletionResult {
  text: string;
  model: string;
  stopReason: string | null;
}

// Único lugar del proyecto que redacta con el modelo de chat. SOLO con
// fetch al router OpenAI-compatible (Guía HF, lección 2) — a diferencia de
// embeddings.ts, acá NO se usa el SDK.
export async function generateCompletion(
  system: string,
  user: string,
): Promise<CompletionResult> {
  const token = process.env.HUGGINGFACEHUB_API_TOKEN;
  if (!token) {
    throw new Error("HUGGINGFACEHUB_API_TOKEN no está configurada.");
  }
  const model = process.env.HUGGINGFACE_CHAT_MODEL || HUGGINGFACE_CHAT_MODEL_DEFAULT;

  let response: Response;
  try {
    response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: HUGGINGFACE_CHAT_MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    throw new Error("No se pudo conectar con el proveedor de IA. Intenta de nuevo.");
  }

  // Errores distintos, mensajes distintos (lección 8): 401 = token mal
  // configurado; 429 = cuota agotada; "model"/"provider" en el cuerpo =
  // el modelo gratuito rotó (lección 3); sin choices = respuesta inválida.
  if (response.status === 401) {
    throw new Error("El token de Hugging Face no es válido. Revisa HUGGINGFACEHUB_API_TOKEN.");
  }
  if (response.status === 429) {
    throw new Error("Se alcanzó el límite de la cuota gratuita de Hugging Face. Intenta más tarde.");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (/model|provider/i.test(body)) {
      throw new Error(
        `El modelo "${model}" ya no está disponible en el nivel gratuito. ` +
          `Cambia HUGGINGFACE_CHAT_MODEL por otro candidato probado.`,
      );
    }
    throw new Error(`El proveedor de IA respondió con un error (${response.status}).`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const text = choice?.message?.content;
  if (!text) {
    throw new Error("El proveedor de IA devolvió una respuesta vacía o inválida.");
  }

  return {
    text,
    model: data.model ?? model,
    stopReason: choice?.finish_reason ?? null,
  };
}
