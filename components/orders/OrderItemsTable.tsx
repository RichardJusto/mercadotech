import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Price } from "@/components/shared/Price";
import type { OrderItem } from "@/types/order";

interface OrderItemsTableProps {
  items: OrderItem[];
}

// Muestra los snapshots (title_snapshot, price_snapshot): lo que el
// comprador vio y pagó, aunque el producto haya cambiado o se haya borrado.
export function OrderItemsTable({ items }: OrderItemsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Cantidad</TableHead>
          <TableHead>Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.title_snapshot}</TableCell>
            <TableCell>
              <Price value={item.price_snapshot} size="sm" />
            </TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>
              <Price value={item.price_snapshot * item.quantity} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
