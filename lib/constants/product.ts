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

// Estándar de resolución para que las fotos de producto se vean bien en
// toda la app — no es un límite arbitrario, cada valor está atado a cómo
// se renderizan hoy:
// - Mínimo 600×600: ProductGallery muestra la imagen principal hasta
//   600px de ancho (components/product/ProductGallery.tsx); por debajo,
//   se ve pixelada al hacer zoom/ampliar.
// - Máximo 4000×4000: evita que un vendedor suba el archivo crudo de una
//   cámara (decenas de MB de foto) sin comprimir — el peso se limita
//   aparte con MAX_IMAGE_BYTES, esto es un techo de resolución razonable.
export const PRODUCT_IMAGE_MIN_WIDTH = 600;
export const PRODUCT_IMAGE_MIN_HEIGHT = 600;
export const PRODUCT_IMAGE_MAX_WIDTH = 4000;
export const PRODUCT_IMAGE_MAX_HEIGHT = 4000;

// Tolerancia sobre 1:1 (cuadrada): ProductCard, la miniatura de
// ProductGallery y CartItemRow renderizan TODAS las imágenes con
// `aspect-square object-cover` — una foto muy rectangular se recorta mal
// (ver components/catalog/ProductCard.tsx). No se bloquea la subida por
// esto (es una recomendación, no todas las fotos de producto pueden ser
// perfectamente cuadradas), solo se avisa.
export const PRODUCT_IMAGE_ASPECT_RATIO_TOLERANCE = 0.15;
