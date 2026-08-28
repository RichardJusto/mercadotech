import { TITLE_MAX, TITLE_MIN } from "@/lib/constants/product";

export interface FieldErrors {
  [field: string]: string;
}

export interface ProductFormInput {
  title: string;
  price: number;
  stock: number;
  categoryId: string;
  imageCount: number;
}

export function validateProduct(input: ProductFormInput): FieldErrors {
  const errors: FieldErrors = {};
  const titleLength = input.title.trim().length;

  if (titleLength < TITLE_MIN || titleLength > TITLE_MAX) {
    errors.title = `El título debe tener entre ${TITLE_MIN} y ${TITLE_MAX} caracteres.`;
  }
  if (!(input.price > 0)) {
    errors.price = "El precio debe ser mayor a 0.";
  }
  if (!(input.stock >= 0)) {
    errors.stock = "El stock no puede ser negativo.";
  }
  if (!input.categoryId) {
    errors.categoryId = "Elige una categoría.";
  }
  if (input.imageCount < 1) {
    errors.images = "Agrega al menos una imagen.";
  }

  return errors;
}
