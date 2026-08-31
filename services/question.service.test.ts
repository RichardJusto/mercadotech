import { describe, expect, it } from "vitest";
import { answer, create, listByProduct } from "@/services/question.service";
import { createSupabaseMock } from "@/services/test-utils/supabase-mock";

describe("question.service.listByProduct", () => {
  it("caso feliz", async () => {
    const rows = [{ id: "q1", question: "¿Trae cargador?" }];
    const supabase = createSupabaseMock({ tables: { questions: { data: rows, error: null } } });
    await expect(listByProduct("prod-1", supabase as never)).resolves.toBe(rows);
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { questions: { data: null, error: boom } } });
    await expect(listByProduct("prod-1", supabase as never)).rejects.toBe(boom);
  });
});

describe("question.service.create", () => {
  it("caso feliz", async () => {
    const created = { id: "q1", question: "¿Trae cargador?" };
    const supabase = createSupabaseMock({ tables: { questions: { data: created, error: null } } });
    const result = await create("prod-1", "user-1", "¿Trae cargador?", supabase as never);
    expect(result).toBe(created);
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { questions: { data: null, error: boom } } });
    await expect(
      create("prod-1", "user-1", "¿Trae cargador?", supabase as never),
    ).rejects.toBe(boom);
  });
});

describe("question.service.answer", () => {
  it("caso feliz", async () => {
    const answered = { id: "q1", answer: "Sí, incluye cargador." };
    const supabase = createSupabaseMock({ tables: { questions: { data: answered, error: null } } });
    const result = await answer("q1", "Sí, incluye cargador.", supabase as never);
    expect(result).toBe(answered);
  });

  it("propaga el error", async () => {
    const boom = new Error("fallo de red");
    const supabase = createSupabaseMock({ tables: { questions: { data: null, error: boom } } });
    await expect(answer("q1", "Sí.", supabase as never)).rejects.toBe(boom);
  });
});
