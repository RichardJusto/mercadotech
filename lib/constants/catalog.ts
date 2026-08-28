// Múltiplo de 2/3/4 columnas (grid responsive de ProductGrid): siempre llena
// la última fila sea cual sea el ancho de pantalla.
export const PRODUCTS_PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

// Rango de precio por defecto del FiltersPanel (soles); cubre holgadamente
// el catálogo del seed (max real: S/ 4,299).
export const DEFAULT_MIN_PRICE = 0;
export const DEFAULT_MAX_PRICE = 5000;
