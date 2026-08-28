create table public.product_views (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Cascade (no especificado en la spec): a diferencia de orders/reviews,
  -- esto es un log de eventos sin valor histórico propio — si el usuario
  -- borra su cuenta, sus eventos de vista se borran con él.
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

alter table public.product_views enable row level security;

create index product_views_product_id_idx on public.product_views (product_id);
