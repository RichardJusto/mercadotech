import { describe, expect, it } from "vitest";
import { buildRagUserMessage, SUPPORT_SYSTEM_INSTRUCTIONS } from "@/lib/ai/prompts";

describe("buildRagUserMessage", () => {
  it("incluye la query del usuario", () => {
    const message = buildRagUserMessage("¿cómo devuelvo un producto?", [
      { index: 1, content: "Política de devoluciones." },
    ]);
    expect(message).toContain("¿cómo devuelvo un producto?");
  });

  it("numera las fuentes en el formato [n] contenido", () => {
    const message = buildRagUserMessage("query", [
      { index: 1, content: "Primera fuente." },
      { index: 2, content: "Segunda fuente." },
    ]);
    expect(message).toContain("[1] Primera fuente.");
    expect(message).toContain("[2] Segunda fuente.");
  });

  it("sin fuentes, avisa que no hay información relevante pero conserva la query", () => {
    const message = buildRagUserMessage("¿venden autos usados?", []);
    expect(message).toContain("No hay información relevante");
    expect(message).toContain("¿venden autos usados?");
  });
});

describe("SUPPORT_SYSTEM_INSTRUCTIONS", () => {
  it("incluye la instrucción de sugerir un ticket cuando no hay respuesta", () => {
    expect(SUPPORT_SYSTEM_INSTRUCTIONS).toContain("ticket");
  });
});
