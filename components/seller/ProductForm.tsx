import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableImageGallery } from "@/components/seller/SortableImageGallery";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/constants/product";
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/lib/constants/roles";
import type { FieldErrors } from "@/lib/validators/product";
import type { GalleryImage, ProductFormValues } from "@/hooks/useProductForm";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  values: ProductFormValues;
  errors: FieldErrors;
  images: GalleryImage[];
  categories: CategoryOption[];
  submitting: boolean;
  submitLabel: string;
  onFieldChange: <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveImage: (image: GalleryImage) => void;
  onReorderImages: (images: GalleryImage[]) => void;
  onSubmit: () => void;
}

const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

export function ProductForm({
  values,
  errors,
  images,
  categories,
  submitting,
  submitLabel,
  onFieldChange,
  onAddFiles,
  onRemoveImage,
  onReorderImages,
  onSubmit,
}: ProductFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <Label>Imágenes</Label>
        <SortableImageGallery
          images={images}
          onAddFiles={onAddFiles}
          onRemove={onRemoveImage}
          onReorder={onReorderImages}
          maxImages={MAX_IMAGES_PER_PRODUCT}
        />
        {errors.images ? <p className="text-sm text-destructive">{errors.images}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-title">Título</Label>
        <Input
          id="product-title"
          value={values.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          aria-invalid={!!errors.title}
        />
        {errors.title ? <p className="text-sm text-destructive">{errors.title}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-description">Descripción</Label>
        <Textarea
          id="product-description"
          value={values.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="product-brand">Marca</Label>
          <Input
            id="product-brand"
            value={values.brand}
            onChange={(e) => onFieldChange("brand", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="product-condition">Condición</Label>
          <Select
            value={values.condition}
            onValueChange={(v) => onFieldChange("condition", v as ProductCondition)}
          >
            <SelectTrigger id="product-condition" className="w-full">
              <SelectValue>
                {(v: string | null) => CONDITION_LABELS[v as ProductCondition]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {CONDITION_LABELS[condition]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="product-price">Precio (S/)</Label>
          <Input
            id="product-price"
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => onFieldChange("price", e.target.value)}
            aria-invalid={!!errors.price}
          />
          {errors.price ? <p className="text-sm text-destructive">{errors.price}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="product-stock">Stock</Label>
          <Input
            id="product-stock"
            type="number"
            min={0}
            value={values.stock}
            onChange={(e) => onFieldChange("stock", e.target.value)}
            aria-invalid={!!errors.stock}
          />
          {errors.stock ? <p className="text-sm text-destructive">{errors.stock}</p> : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="product-category">Categoría</Label>
        <Select
          value={values.categoryId}
          onValueChange={(v) => onFieldChange("categoryId", v ?? "")}
        >
          <SelectTrigger id="product-category" className="w-full">
            <SelectValue>
              {(v: string | null) =>
                categories.find((c) => c.id === v)?.name ?? "Elige una categoría"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId ? (
          <p className="text-sm text-destructive">{errors.categoryId}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
