import { describe, expect, it } from "vitest";
import { checkProductImageStandard, type ProductImageMeta } from "@/lib/validators/product-image";
import {
  MAX_IMAGE_BYTES,
  PRODUCT_IMAGE_MIN_WIDTH,
  PRODUCT_IMAGE_MIN_HEIGHT,
  PRODUCT_IMAGE_MAX_WIDTH,
  PRODUCT_IMAGE_MAX_HEIGHT,
} from "@/lib/constants/product";

const validMeta: ProductImageMeta = {
  width: 1200,
  height: 1200,
  sizeBytes: 500 * 1024,
  type: "image/jpeg",
};

describe("checkProductImageStandard", () => {
  it("caso feliz: cuadrada, dentro de peso y resolución -> sin errores ni warnings", () => {
    const result = checkProductImageStandard(validMeta);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("rechaza un formato no permitido", () => {
    const result = checkProductImageStandard({ ...validMeta, type: "image/bmp" });
    expect(result.errors).toHaveLength(1);
  });

  it("rechaza si pesa más que MAX_IMAGE_BYTES", () => {
    const result = checkProductImageStandard({ ...validMeta, sizeBytes: MAX_IMAGE_BYTES + 1 });
    expect(result.errors).toHaveLength(1);
  });

  it("acepta exactamente en el límite de peso", () => {
    const result = checkProductImageStandard({ ...validMeta, sizeBytes: MAX_IMAGE_BYTES });
    expect(result.errors).toEqual([]);
  });

  it("rechaza por debajo de la resolución mínima", () => {
    const result = checkProductImageStandard({
      ...validMeta,
      width: PRODUCT_IMAGE_MIN_WIDTH - 1,
      height: PRODUCT_IMAGE_MIN_HEIGHT - 1,
    });
    expect(result.errors).toHaveLength(1);
  });

  it("rechaza por encima de la resolución máxima", () => {
    const result = checkProductImageStandard({
      ...validMeta,
      width: PRODUCT_IMAGE_MAX_WIDTH + 1,
      height: PRODUCT_IMAGE_MAX_HEIGHT + 1,
    });
    expect(result.errors).toHaveLength(1);
  });

  it("avisa (warning, no error) cuando la imagen no es cuadrada", () => {
    const result = checkProductImageStandard({ ...validMeta, width: 1600, height: 900 });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it("no avisa dentro de la tolerancia de aspecto", () => {
    // 1200x1100 ~ ratio 1.09, dentro del ±15% de tolerancia sobre 1:1.
    const result = checkProductImageStandard({ ...validMeta, width: 1200, height: 1100 });
    expect(result.warnings).toEqual([]);
  });

  it("acumula varios errores a la vez (formato Y peso Y resolución)", () => {
    const result = checkProductImageStandard({
      width: 100,
      height: 100,
      sizeBytes: MAX_IMAGE_BYTES + 1,
      type: "image/bmp",
    });
    expect(result.errors).toHaveLength(3);
  });
});
