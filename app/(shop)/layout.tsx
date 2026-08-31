"use client";

// Client Component: el navbar necesita composición interactiva (menús,
// sheet móvil) y usa useAuth/useCategories, hooks que exigen "use client".

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Container } from "@/components/shared/Container";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useCart } from "@/hooks/useCart";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, logout } = useAuth();
  const { categories } = useCategories();
  const { count } = useCart(user?.id ?? null);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        categories={categories}
        cartCount={count}
        user={
          user && profile
            ? { displayName: profile.display_name, email: user.email ?? "", role: profile.role }
            : null
        }
        onLogout={logout}
        onSearch={(query) => router.push(`/buscar?q=${encodeURIComponent(query)}`)}
      />
      <main className="flex-1">{children}</main>
      <footer className="relative border-t py-6 text-center text-sm text-muted-foreground before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-glow before:to-transparent before:opacity-40">
        <Container>© {new Date().getFullYear()} MercadoTech</Container>
      </footer>
    </div>
  );
}
