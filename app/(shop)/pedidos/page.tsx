"use client";

import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/components/orders/OrderCard";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";

export default function OrdersPage() {
  const { user } = useAuth();
  const { orders, loading, error, retry } = useOrders(user?.id ?? null);

  return (
    <Container className="space-y-4 py-8">
      <h1 className="text-xl font-semibold">Mis pedidos</h1>

      {loading ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState onRetry={retry} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Todavía no tienes pedidos"
          description="Cuando compres algo, aparecerá aquí."
          action={
            <Button render={<Link href="/" />} nativeButton={false}>
              Explorar productos
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </Container>
  );
}
