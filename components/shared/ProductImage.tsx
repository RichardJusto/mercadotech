"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps extends Omit<ImageProps, "alt" | "onError" | "src"> {
  src: string | null;
  alt: string;
}

// Las imágenes del seed no existen en Storage (404 documentado en seed.sql):
// cualquier fallo de carga cae a este placeholder en vez de un ícono roto.
export function ProductImage({ src, alt, className, ...props }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="size-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
