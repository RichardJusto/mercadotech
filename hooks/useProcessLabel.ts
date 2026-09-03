"use client";

import { usePathname } from "next/navigation";

// Mapeo ruta -> etiqueta legible para el widget de soporte flotante: le
// muestra al usuario (comprador o vendedor) en qué proceso está parado sin
// que tenga que explicarlo — coincide con las páginas reales de app/(shop)/
// y app/(seller)/.
const EXACT_LABELS: Record<string, string> = {
  "/": "Catálogo",
  "/buscar": "Búsqueda",
  "/carrito": "Carrito",
  "/pedidos": "Mis pedidos",
  "/favoritos": "Favoritos",
  "/asistente": "Asistente de compras",
  "/soporte": "Soporte",
  "/vendedor/productos": "Mis productos",
  "/vendedor/publicar": "Publicar producto",
  "/vendedor/pedidos": "Pedidos (panel del vendedor)",
};

const PREFIX_LABELS: [prefix: string, label: string][] = [
  ["/categoria/", "Categoría"],
  ["/producto/", "Producto"],
  ["/pedidos/", "Detalle del pedido"],
  ["/vendedor/productos/", "Editar producto"],
];

export function useProcessLabel(): string {
  const pathname = usePathname();
  if (pathname in EXACT_LABELS) return EXACT_LABELS[pathname];
  const prefixMatch = PREFIX_LABELS.find(([prefix]) => pathname.startsWith(prefix));
  return prefixMatch?.[1] ?? "MercadoTech";
}
