"use client";

import { useEffect, useState } from "react";
import { getProductById, getProductImages, registerView } from "@/services/product.service";
import { getCurrentUserId } from "@/services/auth.service";
import type { Product, ProductImage } from "@/types/product";

export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getProductById(productId), getProductImages(productId)])
      .then(([productData, imagesData]) => {
        if (cancelled) return;
        setProduct(productData);
        setImages(imagesData);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    // Fire-and-forget: solo registra la vista si hay sesión (product_views
    // exige authenticated); un anónimo no debe ver fallar nada por esto.
    // Mismo patrón de log que indexing-trigger.service.triggerReindex: un
    // catch mudo no avisa si esto empieza a fallar sistemáticamente.
    getCurrentUserId()
      .then((userId) => {
        if (!userId) return;
        registerView(productId, userId).catch((err: Error) =>
          console.warn("useProduct: no se pudo registrar la vista", err.message),
        );
      })
      .catch((err: Error) => console.warn("useProduct: no se pudo leer el usuario actual", err.message));
  }, [productId]);

  return { product, images, loading, error };
}
