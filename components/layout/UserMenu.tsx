import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/constants/roles";

interface UserMenuUser {
  displayName: string | null;
  email: string;
  role: Role;
}

interface UserMenuProps {
  user: UserMenuUser | null;
  onLogout: () => void;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  if (!user) {
    return (
      <Button render={<Link href="/login" />} nativeButton={false}>
        Ingresar
      </Button>
    );
  }

  const label = user.displayName ?? user.email;
  const isSeller = user.role === "seller" || user.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Menú de usuario"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar>
              <AvatarFallback>{initials(label)}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="opacity-100 font-medium">
          {label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/pedidos" />}>Mis pedidos</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/favoritos" />}>Favoritos</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/asistente" />}>Asistente</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/soporte" />}>Soporte</DropdownMenuItem>
        {isSeller ? (
          <DropdownMenuItem render={<Link href="/vendedor/productos" />}>
            Panel vendedor
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
