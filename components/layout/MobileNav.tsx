"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchBar } from "@/components/layout/SearchBar";
import type { Role } from "@/lib/constants/roles";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface MobileNavUser {
  displayName: string | null;
  email: string;
  role: Role;
}

interface MobileNavProps {
  categories: CategoryOption[];
  user: MobileNavUser | null;
  onLogout: () => void;
  onSearch: (query: string) => void;
}

export function MobileNav({ categories, user, onLogout, onSearch }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const isSeller = user?.role === "seller" || user?.role === "admin";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
            <Menu />
          </Button>
        }
      />
      <SheetContent side="left" className="flex flex-col gap-6 p-4">
        <SheetHeader className="p-0">
          <SheetTitle>MercadoTech</SheetTitle>
        </SheetHeader>

        <SearchBar onSearch={(q) => { onSearch(q); setOpen(false); }} />

        <nav className="flex flex-col gap-1" aria-label="Categorías">
          <p className="px-1 text-xs font-medium text-muted-foreground">Categorías</p>
          {categories.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Sin categorías</p>
          ) : (
            categories.map((category) => (
              <Link
                key={category.id}
                href={`/categoria/${category.slug}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {category.name}
              </Link>
            ))
          )}
        </nav>

        <nav className="flex flex-col gap-1 border-t pt-4" aria-label="Cuenta">
          {user ? (
            <>
              <Link href="/pedidos" onClick={() => setOpen(false)} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                Mis pedidos
              </Link>
              <Link href="/favoritos" onClick={() => setOpen(false)} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                Favoritos
              </Link>
              <Link href="/asistente" onClick={() => setOpen(false)} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                Asistente
              </Link>
              <Link href="/soporte" onClick={() => setOpen(false)} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                Soporte
              </Link>
              {isSeller ? (
                <Link href="/vendedor/productos" onClick={() => setOpen(false)} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  Panel vendedor
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              Ingresar
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
