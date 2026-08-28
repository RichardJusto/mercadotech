"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { FiltersPanel } from "@/components/catalog/FiltersPanel";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";

export default function CategoryPage() {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingState rows={4} /></Container>}>
      <CategoryPageContent />
    </Suspense>
  );
}

function CategoryPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const { categories } = useCategories();
  const category = categories.find((c) => c.slug === slug);

  const { items, total, page, filters, loading, error, setFilter, setPage, retry } =
    useProducts({ categorySlug: slug });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <FiltersPanel value={filters} onChange={setFilter} />
      </aside>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{category?.name ?? "Categoría"}</h1>
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" className="lg:hidden" size="sm">
                  <SlidersHorizontal className="size-4" /> Filtros
                </Button>
              }
            />
            <SheetContent side="left" className="p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <FiltersPanel value={filters} onChange={setFilter} className="mt-4" />
            </SheetContent>
          </Sheet>
        </div>

        {error ? (
          <ErrorState onRetry={retry} />
        ) : (
          <>
            <ProductGrid products={items} loading={loading} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </Container>
  );
}
