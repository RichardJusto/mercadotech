"use client";

import { Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { FiltersPanel } from "@/components/catalog/FiltersPanel";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CategoryCards } from "@/components/catalog/CategoryCards";
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

// useProducts lee useSearchParams(): Next.js exige un límite Suspense para
// poder prerenderizar la página en el build de producción.
export default function HomePage() {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingState rows={4} /></Container>}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const { items, total, page, filters, loading, error, setFilter, setPage, retry } =
    useProducts();
  const { categories } = useCategories();
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

  return (
    <>
      <div className="bg-aurora bg-grid relative border-b">
        <Container className="relative py-10">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Marketplace tech
          </p>
          <h1 className="mt-2 max-w-lg text-2xl font-bold text-balance sm:text-3xl">
            Todo lo que necesitás en tecnología, en un solo lugar.
          </h1>
        </Container>
      </div>

      {/* Categorías visibles como tarjetas — antes solo estaban en el
          dropdown "Categorías" del navbar, que sigue existiendo para
          acceso rápido desde cualquier página. */}
      <Container className="py-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Explorá por categoría</h2>
        </div>
        <CategoryCards categories={categories} />
      </Container>

      <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <FiltersPanel value={filters} onChange={setFilter} />
        </aside>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Todos los productos</h2>
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
    </>
  );
}
