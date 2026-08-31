import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CartIndicatorProps {
  count: number;
}

export function CartIndicator({ count }: CartIndicatorProps) {
  return (
    <Link
      href="/carrito"
      className="relative inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
      aria-label={`Carrito, ${count} ${count === 1 ? "producto" : "productos"}`}
    >
      <ShoppingCart className="size-5" aria-hidden="true" />
      {count > 0 ? (
        <Badge
          data-testid="cart-count"
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
        >
          {count}
        </Badge>
      ) : null}
    </Link>
  );
}
