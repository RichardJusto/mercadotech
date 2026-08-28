create table public.cart_items (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null
    constraint cart_items_quantity_positive_check check (quantity > 0),
  created_at timestamptz not null default now(),
  -- Un producto una sola vez por carrito: agregar el mismo producto de nuevo
  -- debe sumar quantity, no crear otra fila (lo resuelve el service de carrito).
  constraint cart_items_user_product_unique unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

create index cart_items_user_id_idx on public.cart_items (user_id);
