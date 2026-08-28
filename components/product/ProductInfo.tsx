import { Price } from "@/components/shared/Price";
import { ConditionBadge } from "@/components/shared/ConditionBadge";
import type { Product } from "@/types/product";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{product.title}</h1>
      {product.brand ? (
        <p className="text-sm text-muted-foreground">Marca: {product.brand}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <ConditionBadge condition={product.condition} />
      </div>
      <Price value={product.price} size="lg" />
      <p className="text-sm text-muted-foreground">
        {product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}
      </p>
      {product.description ? (
        <p className="whitespace-pre-line text-sm">{product.description}</p>
      ) : null}
    </div>
  );
}
