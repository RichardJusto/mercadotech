import { describe, expect, it } from "vitest";
import { validateProduct, type ProductFormInput } from "@/lib/validators/product";
import { TITLE_MIN, TITLE_MAX } from "@/lib/constants/product";

const validInput: ProductFormInput = {
  title: "Laptop Dell XPS 13",
  price: 4299,
  stock: 12,
  categoryId: "cat-laptops",
  imageCount: 1,
};

describe("validateProduct", () => {
  it(`rechaza un título de menos de ${TITLE_MIN} caracteres (campo title)`, () => {
    const errors = validateProduct({ ...validInput, title: "a".repeat(TITLE_MIN - 1) });
    expect(errors.title).toBeDefined();
  });

  it(`rechaza un título de más de ${TITLE_MAX} caracteres (campo title)`, () => {
    const errors = validateProduct({ ...validInput, title: "a".repeat(TITLE_MAX + 1) });
    expect(errors.title).toBeDefined();
  });

  it("rechaza precio 0 (campo price)", () => {
    const errors = validateProduct({ ...validInput, price: 0 });
    expect(errors.price).toBeDefined();
  });

  it("rechaza precio negativo (campo price)", () => {
    const errors = validateProduct({ ...validInput, price: -10 });
    expect(errors.price).toBeDefined();
  });

  it("acepta un precio válido (campo price sin error)", () => {
    const errors = validateProduct({ ...validInput, price: 0.01 });
    expect(errors.price).toBeUndefined();
  });

  it("rechaza stock negativo (campo stock)", () => {
    const errors = validateProduct({ ...validInput, stock: -1 });
    expect(errors.stock).toBeDefined();
  });

  it("acepta stock en 0 (campo stock sin error)", () => {
    const errors = validateProduct({ ...validInput, stock: 0 });
    expect(errors.stock).toBeUndefined();
  });

  it("rechaza sin categoría (campo categoryId)", () => {
    const errors = validateProduct({ ...validInput, categoryId: "" });
    expect(errors.categoryId).toBeDefined();
  });

  it("rechaza sin imágenes (campo images, no imageCount)", () => {
    const errors = validateProduct({ ...validInput, imageCount: 0 });
    expect(errors.images).toBeDefined();
  });

  it("caso feliz: sin errores con un producto completo y válido", () => {
    expect(validateProduct(validInput)).toEqual({});
  });
});
