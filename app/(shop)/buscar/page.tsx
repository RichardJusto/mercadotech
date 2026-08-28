"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { FiltersPanel } from "@/components/catalog/FiltersPanel";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useProducts } from "@/hooks/useProducts";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import { useAuth } from "@/hooks/useAuth";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";

export default function SearchPage() {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingState rows={4} /></Container>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const { items, total, page, filters, loading, error, setFilter, setPage, retry } =
    useProducts({ search: q || undefined });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <FiltersPanel value={filters} onChange={setFilter} />
      </aside>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Resultados para «{q}»</h1>
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

        <Tabs defaultValue="exacta">
          <TabsList>
            <TabsTrigger value="exacta">Coincidencia exacta</TabsTrigger>
            <TabsTrigger value="ia">
              <Sparkles className="size-4" />
              Resultados con IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exacta" className="mt-4 space-y-4">
            {error ? (
              <ErrorState onRetry={retry} />
            ) : (
              <>
                <ProductGrid products={items} loading={loading} />
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </TabsContent>

          <TabsContent value="ia" className="mt-4">
            <SemanticResultsTab query={q} />
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}

// Separado del tab exacto para que useSemanticSearch (que llama al endpoint
// en cada cambio de query) no dispare si no hay sesión — decisión 1: la IA
// exige sesión para no matar la cuota gratuita de Hugging Face con anónimos.
function SemanticResultsTab({ query }: { query: string }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingState rows={4} />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={<Sparkles className="size-10" />}
        title="Inicia sesión para usar la búsqueda inteligente"
        description="La pestaña de IA encuentra productos por significado, no solo por coincidencia de texto."
        action={
          <Button
            render={<Link href={`/login?redirectTo=${encodeURIComponent(`/buscar?q=${query}`)}`} />}
            nativeButton={false}
          >
            Iniciar sesión
          </Button>
        }
      />
    );
  }

  return <SemanticResultsGrid query={query} />;
}

function SemanticResultsGrid({ query }: { query: string }) {
  const { results, loading, error, retry } = useSemanticSearch(query);

  if (error) {
    return <ErrorState onRetry={retry} />;
  }

  const products = results.map((r) => r.product);
  const similarityById = Object.fromEntries(results.map((r) => [r.product.id, r.similarity]));

  return (
    <ProductGrid
      products={products}
      loading={loading}
      similarityById={similarityById}
      emptyTitle="Sin resultados relevantes"
      emptyDescription="Intenta reformular tu búsqueda con otras palabras."
    />
  );
}
