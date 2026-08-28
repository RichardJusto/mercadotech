"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Container } from "@/components/shared/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, loading, error, update, remove, checkout, retry } = useCart(
    user?.id ?? null,
  );

  async function handleCheckout() {
    try {
      const orderId = await checkout();
      toast.success("Pedido creado");
      router.push(`/pedidos/${orderId}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading) {
    return (
      <Container className="py-8">
        <LoadingState rows={4} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <ErrorState onRetry={retry} />
      </Container>
    );
  }

  return (
    <Container className="space-y-4 py-8">
      <h1 className="text-xl font-semibold">Carrito</h1>

      {items.length === 0 ? (
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos para verlos aquí."
          action={
            <Button render={<Link href="/" />} nativeButton={false}>
              Explorar productos
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={(quantity) => update(item.id, quantity)}
                onRemove={() => remove(item.id)}
              />
            ))}
          </div>
          <CartSummary subtotal={subtotal} onCheckout={handleCheckout} />
        </div>
      )}
    </Container>
  );
}
