-- schema.sql — copia de REFERENCIA del esquema completo de MercadoTech.
-- NO es la fuente de verdad: la fuente de verdad son las migraciones en
-- supabase/migrations/, aplicadas en orden con `supabase db reset`.
-- Este archivo se regenera concatenando esas migraciones; no editar a mano.
-- Generado: 2026-08-25T04:02:40Z — fix de GRANTs faltantes para service_role.

-- ============================================================
-- 20260821100000_enable_extensions.sql
-- ============================================================
-- La spec no especifica el mecanismo de generación de UUIDs. gen_random_uuid()
-- ya es nativo en PostgreSQL 13+ (no requiere pgcrypto), pero se fija la
-- extensión igual, en el schema `extensions` (convención estándar de
-- Supabase), para no depender de la versión exacta del motor y para tener
-- disponibles otras funciones criptográficas si hicieran falta más adelante.
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- 20260821100100_create_helper_functions.sql
-- ============================================================
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

-- ============================================================
-- 20260821100200_create_profiles.sql
-- ============================================================
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

-- ============================================================
-- 20260821100300_create_categories.sql
-- ============================================================
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

-- ============================================================
-- 20260821100400_create_products.sql
-- ============================================================
create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Sin cascade (no especificado en la spec): no se puede borrar un profile
  -- ni una categoría mientras tengan productos asociados. El flujo esperado
  -- es desactivar (is_active = false), no borrar en duro.
  seller_id uuid not null references public.profiles (id),
  category_id uuid not null references public.categories (id),
  title text not null,
  description text,
  brand text,
  condition text not null default 'nuevo'
    constraint products_condition_check
    check (condition in ('nuevo', 'usado', 'reacondicionado')),
  price numeric(12,2) not null
    constraint products_price_positive_check check (price > 0),
  stock integer not null default 0
    constraint products_stock_non_negative_check check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create index products_seller_id_idx on public.products (seller_id);
create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx on public.products (is_active);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- 20260821100500_create_product_images.sql
-- ============================================================
create table public.product_images (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_path text not null,
  position integer not null default 0
);

alter table public.product_images enable row level security;

create index product_images_product_id_idx on public.product_images (product_id);

-- ============================================================
-- 20260821100600_create_cart_items.sql
-- ============================================================
create table public.cart_items (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null
    constraint cart_items_quantity_positive_check check (quantity > 0),
  created_at timestamptz not null default now(),
  -- Un producto una sola vez por carrito: agregar el mismo producto de nuevo
  -- debe sumar quantity, no crear otra fila (lo resuelve el service de carrito).
  constraint cart_items_user_product_unique unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

create index cart_items_user_id_idx on public.cart_items (user_id);

-- ============================================================
-- 20260821100700_create_orders.sql
-- ============================================================
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

-- ============================================================
-- 20260821100800_create_order_items.sql
-- ============================================================
create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Sin cascade (no especificado en la spec): el ítem histórico sobrevive
  -- gracias a title_snapshot/price_snapshot aunque el producto cambie; por
  -- eso además se bloquea borrar un producto con pedidos asociados.
  product_id uuid not null references public.products (id),
  -- Denormalizado a propósito (ver spec): las políticas RLS del vendedor en
  -- Fase 2.3 filtran order_items por seller_id sin necesitar join a products.
  seller_id uuid not null references public.profiles (id),
  title_snapshot text not null,
  price_snapshot numeric(12,2) not null,
  quantity integer not null
    constraint order_items_quantity_positive_check check (quantity > 0)
);

alter table public.order_items enable row level security;

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_seller_id_idx on public.order_items (seller_id);

-- ============================================================
-- 20260821100900_create_checkout_function.sql
-- ============================================================
-- create_order_from_cart: transacción de checkout completa.
--   1) Lee el carrito del comprador; falla si está vacío.
--   2) Bloquea cada producto con FOR UPDATE y valida stock/estado activo.
--   3) Crea la orden y los order_items con snapshots de título y precio.
--   4) Descuenta stock y vacía el carrito.
-- Valida p_buyer_id = auth.uid() para que nadie pueda hacer checkout en
-- nombre de otro usuario aunque conozca su id.
create function public.create_order_from_cart(p_buyer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_cart_count integer;
  v_item record;
  v_product record;
begin
  if p_buyer_id <> auth.uid() then
    raise exception 'p_buyer_id debe coincidir con el usuario autenticado';
  end if;

  select count(*) into v_cart_count
  from public.cart_items
  where user_id = p_buyer_id;

  if v_cart_count = 0 then
    raise exception 'El carrito está vacío';
  end if;

  -- FOR UPDATE bloquea las filas de products involucradas para que dos
  -- checkouts concurrentes no vendan el mismo stock dos veces.
  for v_item in
    select ci.product_id, ci.quantity
    from public.cart_items ci
    where ci.user_id = p_buyer_id
  loop
    select id, title, price, stock, is_active
    into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found or not v_product.is_active then
      raise exception 'El producto % ya no está disponible', v_item.product_id;
    end if;

    if v_product.stock < v_item.quantity then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_product.title, v_product.stock, v_item.quantity;
    end if;

    v_total := v_total + (v_product.price * v_item.quantity);
  end loop;

  insert into public.orders (buyer_id, status, total)
  values (p_buyer_id, 'pendiente', v_total)
  returning id into v_order_id;

  insert into public.order_items
    (order_id, product_id, seller_id, title_snapshot, price_snapshot, quantity)
  select
    v_order_id,
    p.id,
    p.seller_id,
    p.title,
    p.price,
    ci.quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = p_buyer_id;

  update public.products p
  set stock = p.stock - ci.quantity
  from public.cart_items ci
  where p.id = ci.product_id
    and ci.user_id = p_buyer_id;

  delete from public.cart_items where user_id = p_buyer_id;

  return v_order_id;
end;
$$;

revoke execute on function public.create_order_from_cart(uuid) from public;
revoke execute on function public.create_order_from_cart(uuid) from anon;
grant execute on function public.create_order_from_cart(uuid) to authenticated;

-- ============================================================
-- 20260821101000_create_questions.sql
-- ============================================================
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

-- ============================================================
-- 20260821101100_create_reviews.sql
-- ============================================================
create table public.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Sin cascade (no especificado en la spec): se conserva el historial de
  -- reseñas aunque el autor borre su cuenta.
  buyer_id uuid not null references public.profiles (id),
  order_id uuid not null references public.orders (id),
  rating integer not null
    constraint reviews_rating_range_check check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  -- Una reseña por comprador y producto: evita spam de reseñas repetidas.
  -- La política RLS de Fase 2.3 exige además que el pedido esté 'entregado'.
  constraint reviews_product_buyer_unique unique (product_id, buyer_id)
);

alter table public.reviews enable row level security;

create index reviews_product_id_idx on public.reviews (product_id);

-- ============================================================
-- 20260821101200_create_favorites.sql
-- ============================================================
create table public.favorites (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Un like/favorito único por (usuario, producto): evita duplicados por
  -- doble clic y simplifica el toggle en el frontend.
  constraint favorites_user_product_unique unique (user_id, product_id)
);

alter table public.favorites enable row level security;

create index favorites_user_id_idx on public.favorites (user_id);

-- ============================================================
-- 20260821101300_create_product_views.sql
-- ============================================================
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

-- ============================================================
-- 20260821101400_create_support_articles.sql
-- ============================================================
create table public.support_articles (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  content text not null,
  category text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_articles enable row level security;

create trigger set_support_articles_updated_at
  before update on public.support_articles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 20260821101500_create_support_tickets.sql
-- ============================================================
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

-- ============================================================
-- 20260821101600_create_ticket_messages.sql
-- ============================================================
create table public.ticket_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_role text not null
    constraint ticket_messages_sender_role_check
    check (sender_role in ('usuario', 'agente', 'humano')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;

create index ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id);

-- ============================================================
-- 20260821101700_rls_policies.sql
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
-- 20260821101800_storage_buckets.sql
-- ============================================================
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

-- ============================================================
-- 20260824190000_handle_new_user_metadata.sql
-- ============================================================
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

-- ============================================================
-- 20260825000000_enable_pgvector.sql
-- ============================================================
-- Fase 4.1 (sesión 4): extensión pgvector, en `extensions` (no en `public`),
-- mismo patrón que pgcrypto en la Fase 2.2.
create extension if not exists vector with schema extensions;

-- ============================================================
-- 20260825000100_create_knowledge_embeddings.sql
-- ============================================================
-- Fase 4.1 (sesión 4): "fichero" del bibliotecario. Una sola tabla para las
-- dos fuentes (productos y artículos de soporte), discriminada por
-- source_type — más simple que dos tablas gemelas y permite búsquedas
-- conjuntas sin UNION.
--
-- source_id NO tiene FK dura a propósito: apunta a dos tablas de origen
-- distintas (products / support_articles) según source_type, y Postgres no
-- soporta FKs condicionales. La integridad se valida en
-- services/embedding.service.ts al escribir, y vector-search.service.ts
-- descarta huérfanas al leer (ej. un producto borrado cuya ficha sobrevive
-- hasta el próximo reindex/limpieza — ver Fase 4.3).
--
-- Cambiar de modelo de embeddings a uno con otra dimensión exige migración:
-- `alter table knowledge_embeddings alter column embedding type
-- extensions.vector(N)` + recrear el índice HNSW y la función
-- match_knowledge (que también tiene 384 hardcodeado en su firma).
create table public.knowledge_embeddings (
  id uuid primary key default extensions.gen_random_uuid(),
  source_type text not null
    constraint knowledge_embeddings_source_type_check
    check (source_type in ('producto', 'articulo_soporte')),
  source_id uuid not null,
  chunk_index integer not null default 0,
  content text not null,
  embedding extensions.vector(384) not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint knowledge_embeddings_source_unique
    unique (source_type, source_id, chunk_index)
);

alter table public.knowledge_embeddings enable row level security;

-- HNSW con vector_cosine_ops: coincide con el operador <=> que usa
-- match_knowledge (similitud coseno), rápido para búsquedas de "los k más
-- parecidos" sin comparar contra toda la tabla.
create index knowledge_embeddings_embedding_idx
  on public.knowledge_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create index knowledge_embeddings_source_type_idx
  on public.knowledge_embeddings (source_type);

-- ============================================================
-- 20260825000200_create_match_knowledge.sql
-- ============================================================
-- Fase 4.1 (sesión 4): dado el embedding de una pregunta, devuelve las
-- fichas más parecidas por similitud coseno (1 - distancia coseno del
-- operador <=> de pgvector). SECURITY INVOKER a propósito (no DEFINER): la
-- RLS de knowledge_embeddings (solo authenticated) debe aplicar según quién
-- llama, no bypasearse — a diferencia de is_admin()/create_order_from_cart
-- de sesiones anteriores, acá no hace falta saltarse RLS.
create function public.match_knowledge(
  query_embedding extensions.vector(384),
  p_source_type text default null,
  match_count int default 5,
  similarity_threshold float default 0.3
)
returns table (
  source_type text,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    ke.source_type,
    ke.source_id,
    ke.content,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) as similarity
  from public.knowledge_embeddings ke
  where (p_source_type is null or ke.source_type = p_source_type)
    and 1 - (ke.embedding <=> query_embedding) >= similarity_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- 20260825000300_knowledge_embeddings_rls.sql
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

-- ============================================================
-- 20260825000400_grant_service_role.sql
-- ============================================================
-- Fix de un gap heredado de la Fase 2.3 (sesión 2): esa migración otorgó
-- GRANTs explícitos a `anon` y `authenticated` en cada tabla, pero nunca a
-- `service_role`. En esta instancia de Supabase local, `service_role` NO
-- tiene privilegios de tabla por defecto — sin GRANT explícito, el cliente
-- admin (lib/supabase/admin.ts) recibe "permission denied for table X" al
-- intentar leer/escribir, incluso bypaseando RLS correctamente.
--
-- Nunca se detectó antes porque hasta la Fase 4.3 de la sesión 4 (scripts
-- e indexación server-only) nada había usado el cliente admin para tocar
-- una tabla de negocio directamente — los triggers SECURITY DEFINER
-- anteriores (handle_new_user, create_order_from_cart) corren como el
-- dueño de la función, no como service_role, así que no dependían de esto.
--
-- ALL en las tablas (no solo SELECT): el cliente admin necesita poder
-- escribir en knowledge_embeddings (sesión 4) y, en general, es el cliente
-- que bypasea RLS a propósito para tareas de servidor/scripts — restringir
-- sus GRANTs table-level no aporta seguridad real (RLS ya no aplica para
-- este rol) y sí complica cada migración futura que agregue una tabla.
-- ALTER DEFAULT PRIVILEGES cubre las tablas que se creen de ahora en más.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

