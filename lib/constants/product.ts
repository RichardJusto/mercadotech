export const TITLE_MIN = 5;
export const TITLE_MAX = 120;

export const MAX_IMAGES_PER_PRODUCT = 6;

// Igual al límite del bucket product-images (Fase 2.4): valida en cliente
// para dar un error legible antes de que Storage lo rechace.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
