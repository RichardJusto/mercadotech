import { Price } from "@/components/shared/Price";
import { Button } from "@/components/ui/button";

interface CartSummaryProps {
  subtotal: number;
  loading?: boolean;
  disabled?: boolean;
  onCheckout: () => void;
}

export function CartSummary({ subtotal, loading, disabled, onCheckout }: CartSummaryProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Subtotal</span>
        <Price value={subtotal} size="lg" />
      </div>
      <p className="text-xs text-muted-foreground">
        Pago simulado para el laboratorio — no se cobra.
      </p>
      <Button className="w-full" disabled={disabled || loading} onClick={onCheckout}>
        {loading ? "Procesando..." : "Finalizar compra"}
      </Button>
    </div>
  );
}
