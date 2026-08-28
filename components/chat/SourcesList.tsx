import Link from "next/link";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import type { ChatSource } from "@/types/chat";

interface SourcesListProps {
  sources: ChatSource[];
}

// La página del artículo de soporte todavía no existe (llega después de
// esta sesión): por ahora ancla a /soporte, donde el chat ya responde con
// ese mismo contenido citado.
export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {sources.map((source, i) => (
        <li key={`${source.source_type}-${source.source_id}`}>
          {source.source_type === "producto" ? (
            <Link
              href={`/producto/${source.source_id}`}
              className="flex items-center gap-2 rounded-md border bg-background p-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="text-xs text-muted-foreground">[{i + 1}]</span>
              <ProductImage
                src={source.image_url ?? null}
                alt={source.title}
                width={40}
                height={40}
                className="size-10 shrink-0 rounded object-cover"
              />
              <span className="line-clamp-1 flex-1">{source.title}</span>
              {source.price !== undefined ? <Price value={source.price} size="sm" /> : null}
            </Link>
          ) : (
            <Link
              href="/soporte"
              className="flex items-center gap-2 rounded-md border bg-background p-2 text-sm transition-colors hover:bg-muted"
            >
              <span className="text-xs text-muted-foreground">[{i + 1}]</span>
              <span className="line-clamp-1 flex-1">{source.title}</span>
              {source.category ? (
                <span className="text-xs text-muted-foreground">{source.category}</span>
              ) : null}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
