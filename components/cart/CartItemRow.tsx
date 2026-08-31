import { Trash2 } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Forma local, no importada de services/ (componentes no conocen la capa
// de datos): coincide estructuralmente con CartItemWithProduct.
interface CartItemRowItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    stock: number;
    image_url: string | null;
  } | null;
}

interface CartItemRowProps {
  item: CartItemRowItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  if (!item.product) {
    return (
      <div className="flex items-center gap-4 border-b py-4 last:border-0">
        <p className="flex-1 text-sm text-muted-foreground">
          Este producto ya no está disponible.
        </p>
        <Button variant="ghost" size="icon" aria-label="Quitar del carrito" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    );
  }

  const { product } = item;
  const quantityOptions = Array.from({ length: product.stock }, (_, i) => i + 1);

  return (
    <div data-testid="cart-item-row" className="flex items-center gap-4 border-b py-4 last:border-0">
      <ProductImage
        src={product.image_url}
        alt={product.title}
        width={80}
        height={80}
        className="size-20 shrink-0 rounded-md object-cover"
      />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{product.title}</p>
        <Price value={product.price} size="sm" />
      </div>
      <Select
        value={String(item.quantity)}
        onValueChange={(v) => onUpdateQuantity(Number(v))}
      >
        <SelectTrigger className="w-20" aria-label="Cantidad">
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
      <Button variant="ghost" size="icon" aria-label="Quitar del carrito" onClick={onRemove}>
        <Trash2 />
      </Button>
    </div>
  );
}
