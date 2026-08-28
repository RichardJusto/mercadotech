import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { SearchBar } from "@/components/layout/SearchBar";
import { CategoriesMenu } from "@/components/layout/CategoriesMenu";
import { CartIndicator } from "@/components/layout/CartIndicator";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import type { Role } from "@/lib/constants/roles";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface NavbarUser {
  displayName: string | null;
  email: string;
  role: Role;
}

interface NavbarProps {
  categories: CategoryOption[];
  cartCount: number;
  user: NavbarUser | null;
  onLogout: () => void;
  onSearch: (query: string) => void;
}

export function Navbar({ categories, cartCount, user, onLogout, onSearch }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <Container className="flex h-14 items-center gap-4">
        <MobileNav
          categories={categories}
          user={user}
          onLogout={onLogout}
          onSearch={onSearch}
        />

        <Link href="/" className="text-lg font-bold text-primary">
          MercadoTech
        </Link>

        <div className="hidden md:block">
          <CategoriesMenu categories={categories} />
        </div>

        <div className="ml-auto hidden flex-1 justify-center md:flex">
          <SearchBar onSearch={onSearch} />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <CartIndicator count={cartCount} />
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </Container>
    </header>
  );
}
