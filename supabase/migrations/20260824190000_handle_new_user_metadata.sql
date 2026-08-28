-- Fase 3.3 (sesión 3): permite registrarse eligiendo rol comprador/vendedor.
-- Reemplaza handle_new_user (Fase 2.2) desde una migración NUEVA en vez de
-- editar el archivo original: el trigger protect_profile_role (Fase 2.3)
-- impide que un usuario cambie su propio `role` después de creado, así que
-- el único momento en que puede fijarse es en este INSERT. 'admin' NUNCA se
-- acepta desde el registro — solo 'buyer'/'seller'; cualquier otro valor (o
-- ausente, incluida una manipulación del payload desde DevTools) cae a
-- 'buyer'. display_name: si raw_user_meta_data no trae uno (o viene vacío),
-- se usa el prefijo del email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := new.raw_user_meta_data ->> 'role';
  if v_role is null or v_role not in ('buyer', 'seller') then
    v_role := 'buyer';
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    v_role
  );
  return new;
end;
$$;
