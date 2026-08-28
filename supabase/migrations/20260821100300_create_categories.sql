create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  -- Sin cascade (no especificado en la spec): borrar una categoría padre no
  -- debe arrastrar a sus hijas. Quedan con parent_id null (raíz) hasta que
  -- un admin las reasigne.
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
