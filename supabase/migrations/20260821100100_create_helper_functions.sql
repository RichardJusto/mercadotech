-- No especificado en la spec: se centraliza el patrón "updated_at = now()"
-- en una sola función reutilizable (products, support_articles) en vez de
-- duplicar la misma lógica de trigger en cada tabla.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
