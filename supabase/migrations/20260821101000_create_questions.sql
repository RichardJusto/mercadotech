create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Sin cascade (no especificado en la spec): se conserva el historial de
  -- preguntas/respuestas del producto aunque el autor borre su cuenta.
  user_id uuid not null references public.profiles (id),
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

create index questions_product_id_idx on public.questions (product_id);
