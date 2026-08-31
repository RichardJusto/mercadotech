import { beforeEach, describe, expect, it, vi } from "vitest";

// chat.service no llama a Supabase directo (solo reenvía el cliente
// inyectado a vector-search.service) ni a lib/ai/embeddings — lo que
// orquesta de verdad son estas tres funciones. Para probar el ORDEN de la
// orquesta en aislamiento, esta suite mockea vector-search.service además
// de lib/ai/* (una excepción puntual a la letra de la decisión 7, que solo
// nombra lib/ai/*: acá el objetivo no es evitar red — chat.service nunca la
// toca directo — sino aislar la orquesta de sus 3 colaboradores concretos,
// cada uno con su propia suite dedicada en otro archivo).
vi.mock("@/services/vector-search.service", () => ({ searchKnowledge: vi.fn() }));
vi.mock("@/lib/ai/context-builder", () => ({ buildContext: vi.fn() }));
vi.mock("@/lib/ai/completion", () => ({ generateCompletion: vi.fn() }));

import { searchKnowledge } from "@/services/vector-search.service";
import { buildContext } from "@/lib/ai/context-builder";
import { generateCompletion } from "@/lib/ai/completion";
import { ask } from "@/services/chat.service";

const fakeSupabase = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("chat.service.ask — orquestación", () => {
  it("llama en el orden búsqueda -> contexto -> completion", async () => {
    const order: string[] = [];
    vi.mocked(searchKnowledge).mockImplementation(async () => {
      order.push("search");
      return [];
    });
    vi.mocked(buildContext).mockImplementation(() => {
      order.push("context");
      return { userMessage: "msg", sources: [], stats: { contextTruncated: false, totalChars: 0 } };
    });
    vi.mocked(generateCompletion).mockImplementation(async () => {
      order.push("completion");
      return { text: "respuesta", model: "m", stopReason: null };
    });

    await ask("¿qué laptop me recomiendas?", "compras", fakeSupabase);

    expect(order).toEqual(["search", "context", "completion"]);
  });

  it("modo 'compras' filtra source_type='producto' en la búsqueda", async () => {
    vi.mocked(searchKnowledge).mockResolvedValue([]);
    vi.mocked(buildContext).mockReturnValue({
      userMessage: "msg",
      sources: [],
      stats: { contextTruncated: false, totalChars: 0 },
    });
    vi.mocked(generateCompletion).mockResolvedValue({ text: "r", model: "m", stopReason: null });

    await ask("q", "compras", fakeSupabase);

    expect(searchKnowledge).toHaveBeenCalledWith(
      "q",
      { sourceType: "producto" },
      fakeSupabase,
    );
  });

  it("modo 'soporte' filtra source_type='articulo_soporte' en la búsqueda", async () => {
    vi.mocked(searchKnowledge).mockResolvedValue([]);
    vi.mocked(buildContext).mockReturnValue({
      userMessage: "msg",
      sources: [],
      stats: { contextTruncated: false, totalChars: 0 },
    });
    vi.mocked(generateCompletion).mockResolvedValue({ text: "r", model: "m", stopReason: null });

    await ask("q", "soporte", fakeSupabase);

    expect(searchKnowledge).toHaveBeenCalledWith(
      "q",
      { sourceType: "articulo_soporte" },
      fakeSupabase,
    );
  });

  it("hasRelevantContext=false cuando el builder no selecciona fuentes — y la completion SE LLAMA igual", async () => {
    const matches = [{ source_type: "producto", source_id: "p1", content: "x", metadata: {}, similarity: 0.9 }];
    vi.mocked(searchKnowledge).mockResolvedValue(matches as never);
    vi.mocked(buildContext).mockReturnValue({
      userMessage: "sin contexto relevante",
      sources: [],
      stats: { contextTruncated: false, totalChars: 0 },
    });
    vi.mocked(generateCompletion).mockResolvedValue({ text: "no tengo información", model: "m", stopReason: null });

    const result = await ask("¿venden autos usados?", "soporte", fakeSupabase);

    expect(result.hasRelevantContext).toBe(false);
    expect(generateCompletion).toHaveBeenCalledTimes(1);
    expect(result.metadata.retrievedCount).toBe(1);
    expect(result.metadata.usedSourceCount).toBe(0);
  });

  it("arma el ChatResult completo con los datos de cada capa", async () => {
    const matches = [
      { source_type: "producto", source_id: "p1", content: "x", metadata: {}, similarity: 0.8 },
    ];
    const sources = [{ source_type: "producto" as const, source_id: "p1", title: "Laptop", similarity: 0.8 }];
    vi.mocked(searchKnowledge).mockResolvedValue(matches as never);
    vi.mocked(buildContext).mockReturnValue({
      userMessage: "msg",
      sources,
      stats: { contextTruncated: true, totalChars: 500 },
    });
    vi.mocked(generateCompletion).mockResolvedValue({ text: "Te recomiendo [1].", model: "llama-3", stopReason: "stop" });

    const result = await ask("q", "compras", fakeSupabase);

    expect(result).toEqual({
      query: "q",
      answer: "Te recomiendo [1].",
      hasRelevantContext: true,
      sources,
      metadata: {
        model: "llama-3",
        retrievedCount: 1,
        usedSourceCount: 1,
        contextTruncated: true,
      },
    });
  });
});
