"use client";

import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavoritesPage() {
  const { items, loading, error, retry } = useFavorites();

  return (
    <Container className="space-y-4 py-8">
      <h1 className="text-xl font-semibold">Mis favoritos</h1>
      {error ? (
        <ErrorState onRetry={retry} />
      ) : (
        <ProductGrid
          products={items}
          loading={loading}
          emptyAction={
            <Button render={<Link href="/" />} nativeButton={false}>
              Explorar productos
            </Button>
          }
        />
      )}
    </Container>
  );
}
