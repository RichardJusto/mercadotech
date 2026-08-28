-- =============================================================================
-- Fase 2.4 — Storage: buckets y políticas.
-- Dos buckets públicos para lectura; escritura/borrado restringidos al dueño
-- vía el primer segmento del path (storage.foldername(name)[1] = auth.uid()).
-- storage.objects ya tiene RLS habilitado por Supabase; aquí solo se agregan
-- las políticas.
--
-- Tipos MIME: la spec solo pide "tipos MIME de imagen" sin enumerarlos; se
-- asume el set común jpeg/png/webp/gif para ambos buckets.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- =============================================================================
-- product-images: convención de path {seller_id}/{product_id}/{n}.{ext}
-- =============================================================================

-- Lectura pública (bucket ya es público, pero se deja explícito para que la
-- API de Storage se comporte igual por la ruta pública y por la autenticada).
create policy "product_images_bucket_select_public" on storage.objects
  for select
  using (bucket_id = 'product-images');

-- Solo un vendedor autenticado puede escribir, y solo dentro de su propia
-- carpeta (primer segmento del path = su auth.uid()).
create policy "product_images_bucket_insert_own_seller" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'seller'
    )
  );

create policy "product_images_bucket_update_own_seller" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'product-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'seller'
    )
  );

create policy "product_images_bucket_delete_own_seller" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- avatars: convención de path {user_id}/{archivo}
-- =============================================================================

create policy "avatars_bucket_select_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Cualquier usuario autenticado puede escribir su propio avatar (sin
-- restricción de rol: aplica a buyer, seller y admin por igual).
create policy "avatars_bucket_insert_own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars_bucket_update_own" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars_bucket_delete_own" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
