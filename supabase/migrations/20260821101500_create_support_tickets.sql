create table public.support_tickets (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Sin cascade (no especificado en la spec): se conserva el historial de
  -- soporte aunque el usuario borre su cuenta (trazabilidad/auditoría).
  user_id uuid not null references public.profiles (id),
  subject text not null,
  status text not null default 'abierto'
    constraint support_tickets_status_check
    check (status in ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  channel text not null default 'chat'
    constraint support_tickets_channel_check check (channel in ('chat', 'voz')),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create index support_tickets_user_id_idx on public.support_tickets (user_id);
