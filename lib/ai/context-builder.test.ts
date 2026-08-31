import { describe, expect, it } from "vitest";
import { buildContext, type RetrievedSource } from "@/lib/ai/context-builder";
import {
  CONTEXT_BUILDER_DEFAULT_MAX_SOURCES,
  CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY,
  CONTEXT_BUILDER_MIN_CONTENT_LENGTH,
  CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS,
} from "@/lib/constants/ai";

function source(overrides: Partial<RetrievedSource> = {}): RetrievedSource {
  return {
    source_type: "producto",
    source_id: "id",
    content: "x".repeat(50),
    metadata: { title: "Producto" },
    similarity: 0.9,
    ...overrides,
  };
}

describe("buildContext — selección", () => {
  it("filtra fuentes bajo la similitud mínima", () => {
    const below = source({ source_id: "below", similarity: CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY - 0.01 });
    const at = source({ source_id: "at", similarity: CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY });
    const result = buildContext("q", [below, at]);
    expect(result.sources.map((s) => s.source_id)).toEqual(["at"]);
  });

  it("filtra fuentes con contenido más corto que el mínimo", () => {
    const short = source({ source_id: "short", content: "x".repeat(CONTEXT_BUILDER_MIN_CONTENT_LENGTH - 1) });
    const ok = source({ source_id: "ok", content: "x".repeat(CONTEXT_BUILDER_MIN_CONTENT_LENGTH) });
    const result = buildContext("q", [short, ok]);
    expect(result.sources.map((s) => s.source_id)).toEqual(["ok"]);
  });

  it("lista vacía: sin fuentes, sin truncar, mensaje sin contexto", () => {
    const result = buildContext("¿venden autos usados?", []);
    expect(result.sources).toEqual([]);
    expect(result.stats).toEqual({ contextTruncated: false, totalChars: 0 });
    expect(result.userMessage).toContain("No hay información relevante");
    expect(result.userMessage).toContain("¿venden autos usados?");
  });

  it("todas las fuentes bajo el umbral: mismo resultado que lista vacía", () => {
    const result = buildContext("q", [
      source({ similarity: 0.1 }),
      source({ similarity: 0.2 }),
    ]);
    expect(result.sources).toEqual([]);
    expect(result.stats.contextTruncated).toBe(false);
  });

  it("ordena por similitud descendente aunque lleguen desordenadas", () => {
    const result = buildContext("q", [
      source({ source_id: "medio", similarity: 0.5 }),
      source({ source_id: "alto", similarity: 0.9 }),
      source({ source_id: "bajo-pero-pasa", similarity: 0.31 }),
    ]);
    expect(result.sources.map((s) => s.source_id)).toEqual(["alto", "medio", "bajo-pero-pasa"]);
  });

  it("respeta maxSources: de 6 candidatos válidos solo entran los 5 mejores", () => {
    const candidates = Array.from({ length: 6 }, (_, i) =>
      source({ source_id: `c${i}`, similarity: 0.4 + i * 0.01 }),
    );
    const result = buildContext("q", candidates);
    expect(result.sources).toHaveLength(CONTEXT_BUILDER_DEFAULT_MAX_SOURCES);
    // los 5 de mayor similitud: c5..c1 (c0 queda afuera)
    expect(result.sources.map((s) => s.source_id)).not.toContain("c0");
  });

  it("respeta un maxSources custom pasado por opts", () => {
    const candidates = Array.from({ length: 3 }, (_, i) => source({ source_id: `c${i}`, similarity: 0.5 + i }));
    const result = buildContext("q", candidates, { maxSources: 2 });
    expect(result.sources).toHaveLength(2);
  });
});

describe("buildContext — presupuesto de caracteres", () => {
  it("contextTruncated=false cuando todo entra dentro del presupuesto", () => {
    const a = source({ source_id: "a", content: "x".repeat(100) });
    const b = source({ source_id: "b", content: "x".repeat(100), similarity: 0.8 });
    const result = buildContext("q", [a, b], { maxContextChars: 1000 });
    expect(result.stats).toEqual({ contextTruncated: false, totalChars: 200 });
    expect(result.sources).toHaveLength(2);
  });

  it("remaining llega a 0 exacto: la siguiente fuente ni se evalúa por contenido, se corta directo", () => {
    const a = source({ source_id: "a", content: "x".repeat(100), similarity: 0.9 });
    const b = source({ source_id: "b", content: "x".repeat(50), similarity: 0.8 });
    const result = buildContext("q", [a, b], { maxContextChars: 100 });
    expect(result.sources.map((s) => s.source_id)).toEqual(["a"]);
    expect(result.stats).toEqual({ contextTruncated: true, totalChars: 100 });
  });

  it("trunca la fuente que no entra completa cuando el espacio restante alcanza el mínimo truncado", () => {
    const a = source({ source_id: "a", content: "x".repeat(100), similarity: 0.9 });
    const remaining = CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS; // espacio exacto al mínimo
    const b = source({ source_id: "b", content: "y".repeat(remaining + 100), similarity: 0.8 });
    const result = buildContext("q", [a, b], { maxContextChars: 100 + remaining });

    expect(result.sources.map((s) => s.source_id)).toEqual(["a", "b"]);
    expect(result.stats.contextTruncated).toBe(true);
    expect(result.stats.totalChars).toBe(100 + remaining);
    // el contenido truncado de "b" entró recortado en el mensaje
    expect(result.userMessage).toContain(`[2] ${"y".repeat(remaining)}`);
  });

  it("descarta la fuente entera cuando el espacio restante NO alcanza el mínimo truncado", () => {
    const a = source({ source_id: "a", content: "x".repeat(100), similarity: 0.9 });
    const tooSmallRemaining = CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS - 1;
    const b = source({ source_id: "b", content: "y".repeat(300), similarity: 0.8 });
    const result = buildContext("q", [a, b], { maxContextChars: 100 + tooSmallRemaining });

    expect(result.sources.map((s) => s.source_id)).toEqual(["a"]);
    expect(result.stats).toEqual({ contextTruncated: true, totalChars: 100 });
  });
});

describe("buildContext — mapeo de fuentes (toContextSource / sourceTitle)", () => {
  it("producto: expone price e image_url cuando la metadata los trae", () => {
    const result = buildContext("q", [
      source({ metadata: { title: "Laptop", price: 4299, image_url: "https://img" } }),
    ]);
    expect(result.sources[0]).toMatchObject({
      source_type: "producto",
      title: "Laptop",
      price: 4299,
      image_url: "https://img",
    });
  });

  it("producto: price undefined e image_url null cuando la metadata no los trae", () => {
    const result = buildContext("q", [source({ metadata: { title: "Laptop" } })]);
    expect(result.sources[0].price).toBeUndefined();
    expect(result.sources[0].image_url).toBeNull();
  });

  it("articulo_soporte: expone category cuando la metadata la trae", () => {
    const result = buildContext("q", [
      source({ source_type: "articulo_soporte", metadata: { title: "FAQ", category: "envíos" } }),
    ]);
    expect(result.sources[0]).toMatchObject({ source_type: "articulo_soporte", category: "envíos" });
  });

  it("articulo_soporte: category undefined cuando la metadata no la trae", () => {
    const result = buildContext("q", [source({ source_type: "articulo_soporte", metadata: { title: "FAQ" } })]);
    expect(result.sources[0].category).toBeUndefined();
  });

  it("título 'Sin título' cuando la metadata no trae un title string", () => {
    const result = buildContext("q", [source({ metadata: {} })]);
    expect(result.sources[0].title).toBe("Sin título");
  });
});
