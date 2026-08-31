import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PRODUCT_IMAGE_MIN_WIDTH,
  PRODUCT_IMAGE_MIN_HEIGHT,
  PRODUCT_IMAGE_MAX_WIDTH,
  PRODUCT_IMAGE_MAX_HEIGHT,
  PRODUCT_IMAGE_ASPECT_RATIO_TOLERANCE,
} from "@/lib/constants/product";

export interface ProductImageMeta {
  width: number;
  height: number;
  sizeBytes: number;
  type: string;
}

export interface ProductImageStandardResult extends ProductImageMeta {
  // Bloquean la subida: formato/peso/resolución fuera del estándar.
  errors: string[];
  // No bloquean, solo informan (ej. aspecto no cuadrado).
  warnings: string[];
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

// Pura y sin APIs de navegador a propósito (framework-agnostic, como el
// resto de lib/validators/): toma metadata ya leída, no el File — quien
// necesite leer un File real (solo tiene sentido en el cliente, con
// Image()/URL.createObjectURL) usa hooks/useProductForm.ts.
export function checkProductImageStandard(meta: ProductImageMeta): ProductImageStandardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ALLOWED_IMAGE_TYPES.includes(meta.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    errors.push(`Formato "${meta.type || "desconocido"}" no permitido (usa JPG, PNG, WEBP o GIF).`);
  }

  if (meta.sizeBytes > MAX_IMAGE_BYTES) {
    errors.push(`Pesa ${formatBytes(meta.sizeBytes)}, el máximo es ${formatBytes(MAX_IMAGE_BYTES)}.`);
  }

  if (meta.width < PRODUCT_IMAGE_MIN_WIDTH || meta.height < PRODUCT_IMAGE_MIN_HEIGHT) {
    errors.push(
      `Mide ${meta.width}×${meta.height}px, el mínimo es ${PRODUCT_IMAGE_MIN_WIDTH}×${PRODUCT_IMAGE_MIN_HEIGHT}px.`,
    );
  } else if (meta.width > PRODUCT_IMAGE_MAX_WIDTH || meta.height > PRODUCT_IMAGE_MAX_HEIGHT) {
    errors.push(
      `Mide ${meta.width}×${meta.height}px, el máximo es ${PRODUCT_IMAGE_MAX_WIDTH}×${PRODUCT_IMAGE_MAX_HEIGHT}px.`,
    );
  }

  const ratio = meta.height === 0 ? 1 : meta.width / meta.height;
  if (Math.abs(ratio - 1) > PRODUCT_IMAGE_ASPECT_RATIO_TOLERANCE) {
    warnings.push("No es cuadrada: en el catálogo se recorta a 1:1, se recomienda una foto cuadrada.");
  }

  return { ...meta, errors, warnings };
}
