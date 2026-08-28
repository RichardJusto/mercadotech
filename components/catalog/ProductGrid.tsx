import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/types/product";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 overflow-hidden rounded-lg border p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  // Fase 4.4: similitud semántica por id de producto, para el badge de la
  // pestaña "Resultados con IA". Ausente en el grid de catálogo normal.
  similarityById?: Record<string, number>;
}

export function ProductGrid({
  products,
  loading,
  emptyAction,
  emptyTitle = "Sin resultados",
  emptyDescription = "No encontramos productos con esos filtros.",
  similarityById,
}: ProductGridProps) {
  if (loading) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: PRODUCTS_PAGE_SIZE }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} similarity={similarityById?.[product.id]} />
      ))}
    </div>
  );
}
