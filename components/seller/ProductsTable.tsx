"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import type { Product } from "@/types/product";

interface ProductsTableProps {
  products: Product[];
  onToggleActive: (productId: string, isActive: boolean) => void;
  onDelete: (productId: string) => void;
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Eliminar</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar este producto?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Si el producto tiene ventas, no se
            podrá eliminar — desactívalo en su lugar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Sí, eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsTable({ products, onToggleActive, onDelete }: ProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="flex items-center gap-2">
              <ProductImage
                src={product.image_url}
                alt={product.title}
                width={40}
                height={40}
                className="size-10 rounded object-cover"
              />
              {product.title}
            </TableCell>
            <TableCell>
              <Price value={product.price} size="sm" />
            </TableCell>
            <TableCell>{product.stock}</TableCell>
            <TableCell>
              <Badge variant={product.is_active ? "default" : "outline"}>
                {product.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/vendedor/productos/${product.id}/editar`} />}
                nativeButton={false}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleActive(product.id, !product.is_active)}
              >
                {product.is_active ? "Desactivar" : "Activar"}
              </Button>
              <DeleteButton onConfirm={() => onDelete(product.id)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
