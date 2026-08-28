create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Sin cascade (no especificado en la spec): preserva el historial de
  -- pedidos; no debería poder borrarse un profile con pedidos existentes.
  buyer_id uuid not null references public.profiles (id),
  status text not null default 'pendiente'
    constraint orders_status_check
    check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create index orders_buyer_id_idx on public.orders (buyer_id);
