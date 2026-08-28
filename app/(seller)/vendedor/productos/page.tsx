"use client";

import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/seller/ProductsTable";
import { useAuth } from "@/hooks/useAuth";
import { useSellerProducts } from "@/hooks/useSellerProducts";

export default function SellerProductsPage() {
  const { profile } = useAuth();
  const { products, loading, error, toggleActive, remove, retry } = useSellerProducts(
    profile?.id ?? null,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mis productos</h1>
        <Button render={<Link href="/vendedor/publicar" />} nativeButton={false}>
          Publicar producto
        </Button>
      </div>

      {loading ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState onRetry={retry} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Todavía no tienes productos"
          description="Publica tu primer producto para empezar a vender."
          action={
            <Button render={<Link href="/vendedor/publicar" />} nativeButton={false}>
              Publicar producto
            </Button>
          }
        />
      ) : (
        <ProductsTable
          products={products}
          onToggleActive={(id, isActive) =>
            toggleActive(id, isActive).catch((err: Error) => toast.error(err.message))
          }
          onDelete={(id) => remove(id).catch((err: Error) => toast.error(err.message))}
        />
      )}
    </div>
  );
}
