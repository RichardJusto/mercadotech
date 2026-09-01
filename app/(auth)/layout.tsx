import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listActiveProducts } from "@/services/product.service";
import { Logo } from "@/components/shared/Logo";
import { AuthShowcasePanel } from "@/components/auth/AuthShowcasePanel";

const SHOWCASE_PRODUCT_COUNT = 4;

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // El login/registro NUNCA puede caerse por un problema en la vitrina de
  // productos (red, RLS, o el proyecto de Supabase del entorno todavía sin
  // seed) — es decorativa. Si esta consulta falla, el panel se muestra sin
  // productos en vez de tirar abajo la página completa.
  let showcaseProducts: { id: string; title: string; price: number; image_url: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { items } = await listActiveProducts({ sort: "recientes" }, supabase);
    showcaseProducts = items.slice(0, SHOWCASE_PRODUCT_COUNT).map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
    }));
  } catch (err) {
    console.error("AuthLayout: no se pudieron cargar productos para el showcase", err);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-6 p-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <AuthShowcasePanel products={showcaseProducts} />
    </div>
  );
}
