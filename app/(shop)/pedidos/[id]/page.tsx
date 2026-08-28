"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Container } from "@/components/shared/Container";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Price } from "@/components/shared/Price";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderItemsTable } from "@/components/orders/OrderItemsTable";
import { useOrder } from "@/hooks/useOrders";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { order, loading, error, cancel, retry } = useOrder(id);

  async function handleCancel() {
    try {
      await cancel();
      toast.success("Pedido cancelado");
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

  if (error || !order) {
    return (
      <Container className="py-8">
        <ErrorState
          title="No pudimos cargar este pedido"
          description="Puede que no exista o que no tengas acceso a él."
          onRetry={retry}
        />
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("es-PE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <OrderItemsTable items={order.items} />

      <div className="flex items-center justify-between border-t pt-4">
        <span className="font-medium">Total</span>
        <Price value={order.total} size="lg" />
      </div>

      {order.status === "pendiente" ? (
        <Dialog>
          <DialogTrigger render={<Button variant="destructive">Cancelar pedido</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Cancelar este pedido?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. El stock no se repone
                automáticamente al cancelar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={handleCancel}>
                Sí, cancelar pedido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </Container>
  );
}
