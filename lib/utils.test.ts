import { describe, expect, it } from "vitest";
import { cn, formatPrice } from "@/lib/utils";

// Intl.NumberFormat("es-PE") separa "S/" del monto con un espacio duro
// (U+00A0, no un espacio normal): se arma con fromCharCode para no depender
// de un caracter invisible tipeado a mano en el literal del test.
const NBSP = String.fromCharCode(0xa0);

describe("formatPrice", () => {
  it("formatea 0", () => {
    expect(formatPrice(0)).toBe(`S/${NBSP}0.00`);
  });

  it("redondea a 2 decimales", () => {
    expect(formatPrice(219.005)).toBe(`S/${NBSP}219.01`);
  });

  it("agrega separador de miles", () => {
    expect(formatPrice(1234.5)).toBe(`S/${NBSP}1,234.50`);
  });

  it("acepta un number", () => {
    expect(formatPrice(219)).toBe(`S/${NBSP}219.00`);
  });

  it("acepta un string (numeric de PostgREST) y da el mismo resultado que el number equivalente", () => {
    expect(formatPrice("219.00")).toBe(formatPrice(219));
  });
});

describe("cn", () => {
  it("combina clases básicas", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resuelve conflictos de Tailwind quedándose con la última clase (twMerge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
