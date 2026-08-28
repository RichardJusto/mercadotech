"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductForm } from "@/components/seller/ProductForm";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useProductForm } from "@/hooks/useProductForm";

export default function SellerEditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { categories } = useCategories();
  const form = useProductForm({ sellerId: profile?.id ?? "", productId: id });

  async function handleSubmit() {
    try {
      const productId = await form.submit();
      if (!productId) return;
      toast.success("Cambios guardados");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (form.loading) {
    return <LoadingState rows={4} />;
  }

  // El producto activo es público para lectura (RLS), pero solo su dueño
  // puede editarlo — la spec exige que ni siquiera se pueda "abrir" esta
  // pantalla para un producto ajeno, no solo que el guardado falle callado.
  if (form.isOwner === false) {
    return (
      <ErrorState
        title="No puedes editar este producto"
        description="Este producto no te pertenece."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Editar producto</h1>
      <ProductForm
        values={form.values}
        errors={form.errors}
        images={form.images}
        categories={categories}
        submitting={form.submitting}
        submitLabel="Guardar cambios"
        onFieldChange={form.setField}
        onAddFiles={form.addFiles}
        onRemoveImage={form.removeImage}
        onReorderImages={form.reorder}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
