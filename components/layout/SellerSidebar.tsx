"use client";

import { useState } from "react";
import { LayoutGrid, ListOrdered, PlusCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLink } from "@/components/layout/NavLink";

const LINKS = [
  { href: "/vendedor/productos", label: "Mis productos", icon: LayoutGrid },
  { href: "/vendedor/pedidos", label: "Pedidos", icon: ListOrdered },
  { href: "/vendedor/publicar", label: "Publicar", icon: PlusCircle },
];

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Panel del vendedor">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          href={href}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          activeClassName="bg-muted text-primary font-semibold"
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function SellerSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="border-b p-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Abrir menú de vendedor">
                <Menu />
              </Button>
            }
          />
          <SheetContent side="left" className="p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Panel del vendedor</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SidebarLinks onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden w-56 shrink-0 border-r p-4 md:block">
        <SidebarLinks />
      </aside>
    </>
  );
}
