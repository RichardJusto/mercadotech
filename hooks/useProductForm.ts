"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as sellerService from "@/services/seller.service";
import * as storageService from "@/services/storage.service";
import { getProductById, getProductImages } from "@/services/product.service";
import { triggerReindex } from "@/services/indexing-trigger.service";
import { validateProduct, type FieldErrors } from "@/lib/validators/product";
import {
  checkProductImageStandard,
  type ProductImageMeta,
  type ProductImageStandardResult,
} from "@/lib/validators/product-image";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/constants/product";
import type { ProductCondition } from "@/lib/constants/roles";

export interface LocalGalleryImage {
  kind: "local";
  key: string;
  file: File;
  previewUrl: string;
  // Dimensiones/peso/formato ya evaluados contra el estándar (ver
  // lib/validators/product-image.ts) — SortableImageGallery los muestra
  // como caption y warning debajo de la miniatura.
  standard: ProductImageStandardResult;
}

// Único punto de la app que decodifica el File para leer su resolución
// real — solo tiene sentido en el navegador (Image real), por eso vive acá
// y no en lib/validators/ (framework-agnostic a propósito).
function readImageFile(file: File): Promise<ProductImageMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight, sizeBytes: file.size, type: file.type });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen — el archivo puede estar dañado."));
    };
    img.src = url;
  });
}

export interface PersistedGalleryImage {
  kind: "persisted";
  key: string;
  id: string;
  imagePath: string;
  imageUrl: string;
}

export type GalleryImage = LocalGalleryImage | PersistedGalleryImage;

export interface ProductFormValues {
  title: string;
  description: string;
  brand: string;
  condition: ProductCondition;
  price: string;
  stock: string;
  categoryId: string;
}

const EMPTY_VALUES: ProductFormValues = {
  title: "",
  description: "",
  brand: "",
  condition: "nuevo",
  price: "",
  stock: "",
  categoryId: "",
};

interface UseProductFormOptions {
  sellerId: string;
  productId?: string; // presente = modo edit
}

export function useProductForm({ sellerId, productId }: UseProductFormOptions) {
  const mode = productId ? "edit" : "create";
  const [values, setValues] = useState<ProductFormValues>(EMPTY_VALUES);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  // null mientras carga; false si el producto es de otro vendedor (RLS deja
  // leerlo por ser público, pero no editarlo — no ver.rls-validation.sql).
  const [isOwner, setIsOwner] = useState<boolean | null>(mode === "create" ? true : null);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    Promise.all([getProductById(productId), getProductImages(productId)]).then(
      ([product, productImages]) => {
        if (product.seller_id !== sellerId) {
          setIsOwner(false);
          setLoading(false);
          return;
        }
        setIsOwner(true);
        setValues({
          title: product.title,
          description: product.description ?? "",
          brand: product.brand ?? "",
          condition: product.condition,
          price: String(product.price),
          stock: String(product.stock),
          categoryId: product.category_id,
        });
        setImages(
          productImages.map((img) => ({
            kind: "persisted",
            key: img.id,
            id: img.id,
            imagePath: img.image_path,
            imageUrl: img.image_url,
          })),
        );
        setLoading(false);
      },
    );
  }, [mode, productId, sellerId]);

  function setField<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function refreshPersistedImages() {
    if (!productId) return;
    const productImages = await getProductImages(productId);
    setImages(
      productImages.map((img) => ({
        kind: "persisted",
        key: img.id,
        id: img.id,
        imagePath: img.image_path,
        imageUrl: img.image_url,
      })),
    );
  }

  async function addFiles(files: File[]) {
    const room = MAX_IMAGES_PER_PRODUCT - images.length;
    if (files.length > room) {
      toast.error(`Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.`);
    }
    const candidates = files.slice(0, room);

    // Se lee cada archivo (dimensiones reales, no solo type/size) y se
    // evalúa contra el estándar ANTES de agregarlo — así el vendedor se
    // entera al toque si una foto no sirve, no recién al publicar.
    const checked = await Promise.all(
      candidates.map(async (file) => {
        try {
          const meta = await readImageFile(file);
          return { file, standard: checkProductImageStandard(meta) };
        } catch (err) {
          return {
            file,
            standard: {
              width: 0,
              height: 0,
              sizeBytes: file.size,
              type: file.type,
              errors: [(err as Error).message],
              warnings: [],
            },
          };
        }
      }),
    );

    const accepted = checked.filter(({ standard }) => standard.errors.length === 0);
    checked
      .filter(({ standard }) => standard.errors.length > 0)
      .forEach(({ file, standard }) => toast.error(`${file.name}: ${standard.errors.join(" ")}`));
    accepted.forEach(({ file, standard }) =>
      standard.warnings.forEach((warning) => toast.warning(`${file.name}: ${warning}`)),
    );

    if (accepted.length === 0) return;

    if (mode === "create") {
      setImages((prev) => [
        ...prev,
        ...accepted.map(({ file, standard }) => ({
          kind: "local" as const,
          key: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          standard,
        })),
      ]);
      return;
    }

    // Modo edit: se sube al instante, n = max(n) + 1.
    if (!productId) return;
    const maxN = images.reduce((max, img) => {
      const n = img.kind === "persisted" ? storageService.positionFromImagePath(img.imagePath) : 0;
      return Math.max(max, n);
    }, 0);

    accepted
      .reduce(
        (chain, { file }, index) =>
          chain.then(async () => {
            const { path } = await storageService.uploadProductImage(
              file,
              sellerId,
              productId,
              maxN + index + 1,
            );
            await storageService.saveImageOrder([
              { product_id: productId, image_path: path, position: images.length + index },
            ]);
          }),
        Promise.resolve(),
      )
      .then(refreshPersistedImages)
      .catch((err: Error) => toast.error(err.message));
  }

  async function removeImage(image: GalleryImage) {
    if (image.kind === "local") {
      URL.revokeObjectURL(image.previewUrl);
      setImages((prev) => prev.filter((img) => img.key !== image.key));
      return;
    }
    try {
      await storageService.deleteProductImage(image.imagePath);
      setImages((prev) => prev.filter((img) => img.key !== image.key));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function reorder(newOrder: GalleryImage[]) {
    setImages(newOrder);
    if (mode !== "edit" || !productId) return;

    const items = newOrder
      .filter((img): img is PersistedGalleryImage => img.kind === "persisted")
      .map((img, index) => ({
        id: img.id,
        product_id: productId,
        image_path: img.imagePath,
        position: index,
      }));
    try {
      await storageService.saveImageOrder(items);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function submit(): Promise<string | null> {
    const validationErrors = validateProduct({
      title: values.title,
      price: Number(values.price),
      stock: Number(values.stock),
      categoryId: values.categoryId,
      imageCount: images.length,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return null;

    setSubmitting(true);
    try {
      const input = {
        categoryId: values.categoryId,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        brand: values.brand.trim() || undefined,
        condition: values.condition,
        price: Number(values.price),
        stock: Number(values.stock),
      };

      if (mode === "create") {
        const { id: newProductId } = await sellerService.createProduct(sellerId, input);

        // El path de Storage exige product_id: recién ahora se pueden subir
        // las imágenes, en el orden local actual.
        const localImages = images.filter(
          (img): img is LocalGalleryImage => img.kind === "local",
        );
        const uploaded = [];
        for (let i = 0; i < localImages.length; i++) {
          const { path } = await storageService.uploadProductImage(
            localImages[i].file,
            sellerId,
            newProductId,
            i + 1,
          );
          uploaded.push({ product_id: newProductId, image_path: path, position: i });
        }
        if (uploaded.length > 0) {
          await storageService.saveImageOrder(uploaded);
        }

        // Fire-and-forget: no se espera, nunca bloquea ni rompe publicar.
        triggerReindex("producto", newProductId);
        return newProductId;
      }

      await sellerService.updateProduct(productId!, input);
      triggerReindex("producto", productId!);
      return productId!;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    mode,
    values,
    images,
    errors,
    loading,
    submitting,
    isOwner,
    setField,
    addFiles,
    removeImage,
    reorder,
    submit,
  };
}
