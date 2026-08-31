"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface BuyBoxProps {
  product: Product;
  isOwner: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: (quantity: number) => void;
}

export function BuyBox({
  product,
  isOwner,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}: BuyBoxProps) {
  const [quantity, setQuantity] = useState(1);

  const disabledReason = !product.is_active
    ? "Este producto ya no está disponible."
    : isOwner
      ? "Es tu propio producto."
      : product.stock === 0
        ? "Sin stock disponible."
        : null;

  const quantityOptions = Array.from({ length: product.stock }, (_, i) => i + 1);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {disabledReason ? (
        <p data-testid="buybox-disabled-reason" className="text-sm text-muted-foreground">
          {disabledReason}
        </p>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="buybox-quantity" className="text-sm font-medium">
            Cantidad
          </label>
          <Select
            value={String(quantity)}
            onValueChange={(v) => setQuantity(Number(v))}
          >
            <SelectTrigger id="buybox-quantity" data-testid="buybox-quantity-trigger" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quantityOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          data-testid="buybox-add-to-cart"
          className="flex-1"
          disabled={!!disabledReason}
          onClick={() => onAddToCart(quantity)}
        >
          Agregar al carrito
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
        >
          <Heart className={cn(isFavorite && "fill-destructive text-destructive")} />
        </Button>
      </div>
    </div>
  );
}
