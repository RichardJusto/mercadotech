"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { OrdersKanban } from "@/components/seller/OrdersKanban";
import { useAuth } from "@/hooks/useAuth";
import { useSellerOrders } from "@/hooks/useSellerOrders";

export default function SellerOrdersPage() {
  const { profile } = useAuth();
  const { orders, grouped, loading, error, move, retry } = useSellerOrders(
    profile?.id ?? null,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pedidos</h1>

      {loading ? (
        <LoadingState rows={3} />
      ) : error ? (
        <ErrorState onRetry={retry} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Todavía no tienes pedidos"
          description="Cuando alguien compre tus productos, aparecerán aquí."
        />
      ) : (
        <OrdersKanban grouped={grouped} onMove={move} />
      )}
    </div>
  );
}
