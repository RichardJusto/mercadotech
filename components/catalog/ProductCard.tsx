import Link from "next/link";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import { RatingStars } from "@/components/shared/RatingStars";
import { ConditionBadge } from "@/components/shared/ConditionBadge";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  // Solo lo pasa la pestaña "Resultados con IA" de /buscar (Fase 4.4):
  // porcentaje de parecido semántico con la consulta, 0–1.
  similarity?: number;
  // Fase 7.2: ProductGrid lo pasa en true para las primeras tarjetas
  // (above-the-fold en cualquier grid — home, categoría, búsqueda) para que
  // Next.js precargue esa imagen en vez de esperar a que el navegador la
  // descubra — es la imagen que mide "largest-contentful-paint" en Lighthouse.
  priority?: boolean;
}

export function ProductCard({ product, similarity, priority = false }: ProductCardProps) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
    >
      {similarity !== undefined ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow">
          {Math.round(similarity * 100)}% similar
        </span>
      ) : null}
      <ProductImage
        src={product.image_url}
        alt={product.title}
        width={300}
        height={300}
        // Coincide con las columnas reales del grid (grid-cols-1/2/3/4 en
        // components/catalog/ProductGrid.tsx) — sin esto Next.js no sabe qué
        // tamaño de srcset servir y termina mandando la imagen más grande a
        // todos los viewports.
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        priority={priority}
        className="aspect-square w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">
          {product.title}
        </p>
        <Price value={product.price} />
        <div className="flex items-center justify-between">
          <ConditionBadge condition={product.condition} />
          {product.review_count > 0 ? (
            <div className="flex items-center gap-1">
              <RatingStars value={Math.round(product.average_rating)} size={12} />
              <span className="text-xs text-muted-foreground">({product.review_count})</span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
