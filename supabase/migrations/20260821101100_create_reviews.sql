create table public.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Sin cascade (no especificado en la spec): se conserva el historial de
  -- reseñas aunque el autor borre su cuenta.
  buyer_id uuid not null references public.profiles (id),
  order_id uuid not null references public.orders (id),
  rating integer not null
    constraint reviews_rating_range_check check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  -- Una reseña por comprador y producto: evita spam de reseñas repetidas.
  -- La política RLS de Fase 2.3 exige además que el pedido esté 'entregado'.
  constraint reviews_product_buyer_unique unique (product_id, buyer_id)
);

alter table public.reviews enable row level security;

create index reviews_product_id_idx on public.reviews (product_id);
