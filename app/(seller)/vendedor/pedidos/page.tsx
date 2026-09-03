"use client";

import dynamic from "next/dynamic";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useSellerOrders } from "@/hooks/useSellerOrders";

// @dnd-kit/core es pesado (~1.4MB sin minificar) y solo lo usa esta pantalla
// — dynamic import lo saca del bundle inicial de /vendedor/pedidos (Fase 7.2,
// justificado en docs/PERFORMANCE.md con el First Load JS antes/después).
const OrdersKanban = dynamic(
  () => import("@/components/seller/OrdersKanban").then((m) => m.OrdersKanban),
  { loading: () => <LoadingState rows={3} /> },
);

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
