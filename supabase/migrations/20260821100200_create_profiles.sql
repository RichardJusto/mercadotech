create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'buyer'
    constraint profiles_role_check check (role in ('buyer', 'seller', 'admin')),
  avatar_path text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- handle_new_user: crea el profile automáticamente al registrarse un usuario
-- en auth.users. display_name se toma de raw_user_meta_data si el signup lo
-- envía; la spec no dice de dónde sale, así que si no viene queda en null y
-- se completa después desde el perfil.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
