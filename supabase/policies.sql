-- policies.sql — copia de REFERENCIA de las políticas RLS + GRANTs de TODO
-- el proyecto. NO es la fuente de verdad: la fuente de verdad son las
-- migraciones RLS de supabase/migrations/. No editar a mano.
-- Generado: 2026-08-25T03:37:03Z.

-- ============================================================
-- 20260821101700_rls_policies.sql (sesión 2)
-- ============================================================
-- =============================================================================
-- Fase 2.3 — Políticas RLS + GRANTs de la Data API.
-- Todas las tablas ya tienen RLS habilitado desde su creación (Fase 2.2), sin
-- políticas: hoy todo está denegado por defecto. Este archivo agrega las
-- políticas y, al final, los GRANTs — sin GRANT, la Data API devuelve errores
-- de permiso opacos aunque la política sea correcta.
-- Todas las políticas usan (select auth.uid()) en vez de auth.uid() a secas
-- para que el planner lo evalúe una sola vez por consulta, no por fila.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: is_admin()
-- SECURITY DEFINER + search_path fijo, propiedad de `postgres` (BYPASSRLS):
-- evita la recursión que se daría si una política de `profiles` disparara de
-- nuevo la política de `profiles` al consultar el rol del usuario.
-- -----------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Helpers para romper la recursión RLS entre orders y order_items: la
-- política de orders necesita mirar order_items (¿tiene ítems de este
-- vendedor?) y la de order_items necesita mirar orders (¿es del comprador?).
-- Si ambas lo hacen con un EXISTS directo, cada una dispara la RLS de la
-- otra tabla, que vuelve a disparar la primera -> "infinite recursion
-- detected in policy". SECURITY DEFINER bypasea RLS dentro del helper,
-- igual que is_admin(), y corta el ciclo.
create function public.order_has_seller_item(p_order_id uuid, p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.order_items
    where order_id = p_order_id and seller_id = p_seller_id
  );
$$;

create function public.order_belongs_to_buyer(p_order_id uuid, p_buyer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders
    where id = p_order_id and buyer_id = p_buyer_id
  );
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================

-- Cada quien ve su propio profile; admin ve todos.
create policy "profiles_select_own_or_admin" on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id or public.is_admin());

-- Sin política de INSERT: el único camino es el trigger handle_new_user
-- (SECURITY DEFINER), que bypasea RLS. Insertar profiles desde el cliente
-- queda bloqueado por defecto.

-- Dueño o admin puede actualizar su profile. El propio `role` lo protege el
-- trigger de abajo, no esta política (RLS no puede comparar OLD vs NEW de una
-- sola columna de forma nativa).
create policy "profiles_update_own_or_admin" on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

-- Sin política de DELETE: un profile solo desaparece por cascade desde
-- auth.users, nunca por acción directa del cliente.

-- `role` NO editable por el propio usuario: solo un admin puede cambiarlo.
create function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'No tienes permiso para cambiar tu propio rol';
  end if;
  return new;
end;
$$;

create trigger protect_profiles_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- =============================================================================
-- CATEGORIES
-- =============================================================================

-- Catálogo de categorías: público, incluye anon.
create policy "categories_select_all" on public.categories
  for select
  using (true);

create policy "categories_insert_admin" on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

create policy "categories_update_admin" on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin" on public.categories
  for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- PRODUCTS
-- =============================================================================

-- Productos activos son públicos; el vendedor ve también los suyos inactivos.
create policy "products_select_active_or_own" on public.products
  for select
  using (is_active or (select auth.uid()) = seller_id);

-- Solo un usuario con rol 'seller' puede publicar, y solo a su propio nombre.
create policy "products_insert_own_as_seller" on public.products
  for insert
  to authenticated
  with check (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'seller'
    )
  );

create policy "products_update_own" on public.products
  for update
  to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create policy "products_delete_own" on public.products
  for delete
  to authenticated
  using ((select auth.uid()) = seller_id);

-- =============================================================================
-- PRODUCT_IMAGES
-- =============================================================================

-- Visibilidad heredada del producto: activo (público) o propio (aunque inactivo).
create policy "product_images_select_matches_product" on public.product_images
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and (p.is_active or p.seller_id = (select auth.uid()))
    )
  );

create policy "product_images_insert_own_product" on public.product_images
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  );

create policy "product_images_update_own_product" on public.product_images
  for update
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  );

create policy "product_images_delete_own_product" on public.product_images
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  );

-- =============================================================================
-- CART_ITEMS
-- =============================================================================

-- Los compradores solo ven y editan SU propio carrito.
create policy "cart_items_select_own" on public.cart_items
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cart_items_insert_own" on public.cart_items
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cart_items_update_own" on public.cart_items
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cart_items_delete_own" on public.cart_items
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- ORDERS
-- =============================================================================

create policy "orders_select_buyer_seller_admin" on public.orders
  for select
  to authenticated
  using (
    (select auth.uid()) = buyer_id
    or public.order_has_seller_item(id, (select auth.uid()))
    or public.is_admin()
  );

-- Sin política de INSERT: el único camino es create_order_from_cart()
-- (SECURITY DEFINER), no un INSERT directo del cliente.

-- El vendedor con ítems en el pedido puede avanzar el estado, pero no puede
-- cancelar (esa acción es exclusiva del comprador, ver política siguiente).
create policy "orders_update_seller_advance_status" on public.orders
  for update
  to authenticated
  using (public.order_has_seller_item(id, (select auth.uid())))
  with check (status <> 'cancelado');

-- El comprador solo puede cancelar un pedido propio que siga 'pendiente'.
create policy "orders_update_buyer_cancel_pending" on public.orders
  for update
  to authenticated
  using ((select auth.uid()) = buyer_id and status = 'pendiente')
  with check ((select auth.uid()) = buyer_id and status = 'cancelado');

-- Sin política de DELETE: los pedidos no se borran.

-- =============================================================================
-- ORDER_ITEMS
-- =============================================================================

create policy "order_items_select_buyer_seller_admin" on public.order_items
  for select
  to authenticated
  using (
    public.order_belongs_to_buyer(order_id, (select auth.uid()))
    or (select auth.uid()) = seller_id
    or public.is_admin()
  );

-- Sin políticas de INSERT/UPDATE/DELETE: order_items solo lo escribe
-- create_order_from_cart() (SECURITY DEFINER).

-- =============================================================================
-- QUESTIONS
-- =============================================================================

-- El producto es público: sus preguntas también.
create policy "questions_select_all" on public.questions
  for select
  using (true);

-- Cualquier autenticado pregunta, siempre a su propio nombre.
create policy "questions_insert_own" on public.questions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- El vendedor dueño del producto puede actualizar la fila para responder.
create policy "questions_update_product_owner" on public.questions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
  );

create policy "questions_delete_author_or_admin" on public.questions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- =============================================================================
-- REVIEWS
-- =============================================================================

create policy "reviews_select_all" on public.reviews
  for select
  using (true);

-- Solo puede reseñar quien compró el producto y el pedido llegó 'entregado'.
create policy "reviews_insert_verified_purchase" on public.reviews
  for insert
  to authenticated
  with check (
    (select auth.uid()) = buyer_id
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.id = reviews.order_id
        and o.buyer_id = (select auth.uid())
        and o.status = 'entregado'
        and oi.product_id = reviews.product_id
    )
  );

create policy "reviews_update_own" on public.reviews
  for update
  to authenticated
  using ((select auth.uid()) = buyer_id)
  with check ((select auth.uid()) = buyer_id);

create policy "reviews_delete_own_or_admin" on public.reviews
  for delete
  to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());

-- =============================================================================
-- FAVORITES
-- =============================================================================

create policy "favorites_select_own" on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Sin política de UPDATE: favoritos se agregan/quitan, no se editan.

create policy "favorites_delete_own" on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- PRODUCT_VIEWS
-- =============================================================================

-- Solo el vendedor del producto (analítica propia) o admin ven los eventos.
create policy "product_views_select_seller_or_admin" on public.product_views
  for select
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.seller_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- Cualquier autenticado registra SU propia vista (no en nombre de otro).
create policy "product_views_insert_own" on public.product_views
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Sin políticas de UPDATE/DELETE: un evento de vista es inmutable.

-- =============================================================================
-- SUPPORT_ARTICLES
-- =============================================================================

-- Públicos si is_published; admin ve también los borradores que gestiona.
create policy "support_articles_select_published_or_admin" on public.support_articles
  for select
  using (is_published or public.is_admin());

create policy "support_articles_insert_admin" on public.support_articles
  for insert
  to authenticated
  with check (public.is_admin());

create policy "support_articles_update_admin" on public.support_articles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "support_articles_delete_admin" on public.support_articles
  for delete
  to authenticated
  using (public.is_admin());

-- =============================================================================
-- SUPPORT_TICKETS
-- =============================================================================

create policy "support_tickets_select_own_or_admin" on public.support_tickets
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "support_tickets_insert_own" on public.support_tickets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- El dueño solo puede cerrar su ticket (el nuevo estado debe ser 'cerrado');
-- admin puede fijar cualquier estado.
create policy "support_tickets_update_own_close_or_admin" on public.support_tickets
  for update
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check (
    public.is_admin()
    or ((select auth.uid()) = user_id and status = 'cerrado')
  );

-- Sin política de DELETE: los tickets no se borran (trazabilidad de soporte).

-- =============================================================================
-- TICKET_MESSAGES
-- =============================================================================

create policy "ticket_messages_select_ticket_owner_or_admin" on public.ticket_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- El dueño del ticket solo puede escribir como 'usuario' (no puede
-- suplantar a soporte); admin puede escribir con cualquier sender_role.
create policy "ticket_messages_insert_ticket_owner_or_admin" on public.ticket_messages
  for insert
  to authenticated
  with check (
    (
      exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.user_id = (select auth.uid())
      )
      and sender_role = 'usuario'
    )
    or public.is_admin()
  );

-- Sin políticas de UPDATE/DELETE: los mensajes de un ticket son inmutables.

-- =============================================================================
-- GRANTs de la Data API
-- RLS decide QUÉ FILAS; el GRANT decide si el rol puede intentar el comando.
-- Sin esto, anon/authenticated reciben "permission denied" aunque la
-- política sea correcta (falla opaca típica de Supabase).
-- =============================================================================

grant usage on schema public to anon, authenticated;

grant select, update on public.profiles to authenticated;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

grant select, insert, update, delete on public.cart_items to authenticated;

grant select, update on public.orders to authenticated;

grant select on public.order_items to authenticated;

grant select on public.questions to anon, authenticated;
grant insert, update, delete on public.questions to authenticated;

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

grant select, insert, delete on public.favorites to authenticated;

grant select, insert on public.product_views to authenticated;

grant select on public.support_articles to anon, authenticated;
grant insert, update, delete on public.support_articles to authenticated;

grant select, insert, update on public.support_tickets to authenticated;

grant select, insert on public.ticket_messages to authenticated;

-- ============================================================
-- 20260825000300_knowledge_embeddings_rls.sql (sesión 4)
-- ============================================================
-- Fase 4.1 (sesión 4): política + GRANTs de knowledge_embeddings.
-- Decisión 1 (spec sesión 4): la IA exige sesión — sin esto, un anónimo
-- vería la pestaña "Resultados con IA" muerta en /buscar; además protege la
-- cuota gratuita de Hugging Face de tráfico no autenticado.

-- SELECT solo para authenticated. Los productos inactivos NO se filtran
-- acá (la tabla no sabe de is_active): vector-search.service.ts cruza con
-- products y descarta los inactivos/huérfanos al hidratar los resultados.
create policy "knowledge_embeddings_select_authenticated" on public.knowledge_embeddings
  for select
  to authenticated
  using (true);

-- Sin políticas de INSERT/UPDATE/DELETE: solo escribe el cliente admin
-- (bypasea RLS), desde app/api/v1/reindex y scripts/index-all.ts — nunca
-- desde el navegador con el cliente de sesión.

grant select on public.knowledge_embeddings to authenticated;

revoke execute on function public.match_knowledge(extensions.vector, text, int, float) from public;
revoke execute on function public.match_knowledge(extensions.vector, text, int, float) from anon;
grant execute on function public.match_knowledge(extensions.vector, text, int, float) to authenticated;
