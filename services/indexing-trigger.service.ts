export type ReindexSourceType = "producto" | "articulo_soporte";

// Fire-and-forget: el caller NUNCA debe hacer `await` de esto en el camino
// crítico de publicar/editar. Si Hugging Face está caído o el endpoint
// falla, se registra un warning y la publicación sigue — reindexar es
// best-effort, no una condición para que publicar funcione.
export async function triggerReindex(
  sourceType: ReindexSourceType,
  sourceId: string,
): Promise<void> {
  try {
    const response = await fetch("/api/v1/reindex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType, sourceId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      console.warn(
        `[indexing-trigger] reindex de ${sourceType}/${sourceId} falló (${response.status}):`,
        body?.error?.message ?? "sin detalle",
      );
    }
  } catch (err) {
    console.warn(
      `[indexing-trigger] no se pudo contactar /api/v1/reindex para ${sourceType}/${sourceId}:`,
      (err as Error).message,
    );
  }
}
