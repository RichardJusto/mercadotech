import { ProductImage } from "@/components/shared/ProductImage";
import { formatPrice } from "@/lib/utils";

interface ShowcaseProduct {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
}

interface AuthShowcasePanelProps {
  products: ShowcaseProduct[];
}

// Puramente presentacional: recibe los productos ya resueltos (AuthLayout
// los trae por services/product.service con el cliente de servidor) — no
// hace fetching ni conoce Supabase, como pide la regla de capas.
export function AuthShowcasePanel({ products }: AuthShowcasePanelProps) {
  return (
    <div className="showcase-bg relative hidden h-full flex-col justify-between p-10 text-white lg:flex">
      <div className="showcase-scanline" aria-hidden="true" />

      <div className="relative">
        <p className="text-xs font-medium tracking-[0.2em] text-white/60 uppercase">
          Marketplace tech
        </p>
        <h2 className="mt-3 max-w-sm text-3xl leading-tight font-bold text-balance">
          Compra y vende tecnología real, sin vueltas.
        </h2>
        <p className="mt-3 max-w-sm text-sm text-white/70">
          Catálogo curado, búsqueda con IA y pedidos rastreables de punta a punta.
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-3">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="animate-rise glow-ring flex items-center gap-3 rounded-xl border border-white/10 bg-white/95 p-2.5 text-foreground backdrop-blur-sm"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              <ProductImage
                src={product.image_url}
                alt=""
                width={48}
                height={48}
                className="size-12 object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{product.title}</p>
              <p className="text-xs font-semibold text-primary">{formatPrice(product.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
