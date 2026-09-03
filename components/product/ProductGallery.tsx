"use client";

import { useState, type KeyboardEvent } from "react";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";
import type { ProductImage as ProductImageType } from "@/types/product";

interface ProductGalleryProps {
  images: ProductImageType[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (images.length <= 1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % images.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + images.length) % images.length);
    }
  }

  return (
    <div className="space-y-3">
      <div
        tabIndex={0}
        role="group"
        aria-label={`Galería de imágenes de ${alt}, usa las flechas para navegar`}
        onKeyDown={handleKeyDown}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ProductImage
          src={active?.image_url ?? null}
          alt={alt}
          width={600}
          height={600}
          // Es el elemento LCP de /producto/[id] — coincide con el layout
          // real (Container className="lg:grid-cols-2", app/(shop)/producto/
          // [id]/page.tsx): mitad del ancho desde lg, ancho completo debajo
          // (Fase 7.2).
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className="aspect-square w-full rounded-lg object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver imagen ${index + 1} de ${images.length}`}
              aria-current={index === activeIndex}
              className={cn(
                "shrink-0 overflow-hidden rounded-md border-2",
                index === activeIndex ? "border-primary" : "border-transparent",
              )}
            >
              <ProductImage
                src={image.image_url}
                alt=""
                width={64}
                height={64}
                className="size-16 object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
