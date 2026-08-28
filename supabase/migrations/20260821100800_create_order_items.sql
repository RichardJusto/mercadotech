create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Sin cascade (no especificado en la spec): el ítem histórico sobrevive
  -- gracias a title_snapshot/price_snapshot aunque el producto cambie; por
  -- eso además se bloquea borrar un producto con pedidos asociados.
  product_id uuid not null references public.products (id),
  -- Denormalizado a propósito (ver spec): las políticas RLS del vendedor en
  -- Fase 2.3 filtran order_items por seller_id sin necesitar join a products.
  seller_id uuid not null references public.profiles (id),
  title_snapshot text not null,
  price_snapshot numeric(12,2) not null,
  quantity integer not null
    constraint order_items_quantity_positive_check check (quantity > 0)
);

alter table public.order_items enable row level security;

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_seller_id_idx on public.order_items (seller_id);
