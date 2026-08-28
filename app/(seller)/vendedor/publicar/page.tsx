"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductForm } from "@/components/seller/ProductForm";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useProductForm } from "@/hooks/useProductForm";

export default function SellerPublishPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { categories } = useCategories();
  const form = useProductForm({ sellerId: profile?.id ?? "" });

  async function handleSubmit() {
    try {
      const productId = await form.submit();
      if (!productId) return; // errores de validación, ya se muestran en el form
      toast.success("Producto publicado");
      router.push(`/vendedor/productos/${productId}/editar`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Publicar producto</h1>
      <ProductForm
        values={form.values}
        errors={form.errors}
        images={form.images}
        categories={categories}
        submitting={form.submitting}
        submitLabel="Publicar"
        onFieldChange={form.setField}
        onAddFiles={form.addFiles}
        onRemoveImage={form.removeImage}
        onReorderImages={form.reorder}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
