import Link from "next/link";
import { Laptop, Smartphone, Cpu, Headphones, Gamepad2, Monitor, Plug, Wifi, Grid3x3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface CategoryCardsProps {
  categories: CategoryOption[];
}

// Un ícono por slug conocido del seed — Grid3x3 es el genérico para
// cualquier categoría nueva que no esté en este mapa todavía.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  laptops: Laptop,
  smartphones: Smartphone,
  "componentes-pc": Cpu,
  audio: Headphones,
  gaming: Gamepad2,
  monitores: Monitor,
  accesorios: Plug,
  redes: Wifi,
};

export function CategoryCards({ categories }: CategoryCardsProps) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.slug] ?? Grid3x3;
        return (
          <Link
            key={category.id}
            href={`/categoria/${category.slug}`}
            className="group flex flex-col items-start gap-2.5 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-glow hover:shadow-[0_12px_28px_-10px_var(--color-glow-soft)]"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-glow-soft text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold group-hover:text-primary">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
