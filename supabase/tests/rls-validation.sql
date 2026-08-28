-- =============================================================================
-- Fase 2.6 — Validación de políticas RLS.
--
-- Cómo correrlo: `psql $DB_URL -f supabase/tests/rls-validation.sql` (o
-- `supabase db query -f ...` / pegarlo en el SQL Editor de Studio) contra la
-- base local ya sembrada (Fase 2.5) — los escenarios asumen los ids fijos del
-- seed.sql. Cada escenario corre en su propia transacción con ROLLBACK: no
-- deja rastro en los datos, se puede correr las veces que haga falta.
--
-- Mecanismo de simulación: `set local role` cambia el rol de Postgres (para
-- que los GRANTs de la Data API también se respeten, no solo RLS) y
-- `set local request.jwt.claim.sub` simula el `sub` del JWT que lee
-- auth.uid() (ver auth.uid(): coalesce de request.jwt.claim.sub y
-- request.jwt.claims->>'sub'). Ambos SET son LOCAL: expiran solos al
-- terminar la transacción.
--
-- Cada prueba usa pg_temp.test_assert(): imprime "PASS: ..." (NOTICE) si la
-- condición se cumple, o aborta con "FAIL: ..." (EXCEPTION) si no. Si el
-- script completo corre sin ningún FAIL, las 9 validaciones mínimas de la
-- spec quedan confirmadas. pg_temp.* es una función de sesión: no persiste ni
-- hay que limpiarla.
-- =============================================================================

create or replace function pg_temp.test_assert(condition boolean, description text)
returns void
language plpgsql
as $$
begin
  if condition then
    raise notice 'PASS: %', description;
  else
    raise exception 'FAIL: %', description;
  end if;
end;
$$;

-- IDs fijos del seed.sql (Fase 2.5), para referencia rápida de este archivo:
--   buyer1  11111111-1111-1111-1111-111111111111  (Ana Torres)
--   buyer2  22222222-2222-2222-2222-222222222222  (Carlos Medina)
--   buyer3  33333333-3333-3333-3333-333333333333  (Lucía Fernández)
--   seller1 44444444-4444-4444-4444-444444444444  (TechZone Perú)
--   seller2 55555555-5555-5555-5555-555555555555  (Digital World)
--   admin   66666666-6666-6666-6666-666666666666  (Admin MercadoTech)
--   product a...0001 Dell XPS 13        seller1  activo
--   product a...0002 Lenovo ThinkPad    seller1  INACTIVO
--   product a...0005 RTX 4070           seller1  activo (pregunta sin responder)
--   product a...0007 Audífonos Sony     seller1  activo (en order d...0004, entregado, buyer1)
--   product a...0009 Monitor LG         seller2  activo
--   product a...0011 Router TP-Link     seller2  activo (en order d...0004, entregado, buyer1)
--   product a...0013 Mouse Razer        seller2  activo (pregunta sin responder)
--   order   d...0001 buyer1  pendiente  (item: producto seller1)
--   order   d...0003 buyer3  enviado    (item: producto seller2 únicamente)
--   order   d...0004 buyer1  entregado  (items: producto seller1 Y seller2)

-- =============================================================================
-- 1. Anónimo: ve productos activos; NO ve carritos, pedidos ni tickets.
-- =============================================================================
begin;
set local role anon;

do $$
declare
  v_active_count int;
  v_inactive_count int;
begin
  select count(*) into v_active_count from public.products where id = 'a0000000-0000-0000-0000-000000000001';
  perform pg_temp.test_assert(v_active_count = 1, 'anon ve el producto activo a...0001');

  select count(*) into v_inactive_count from public.products where id = 'a0000000-0000-0000-0000-000000000002';
  perform pg_temp.test_assert(v_inactive_count = 0, 'anon NO ve el producto inactivo a...0002');
end $$;

-- anon no tiene GRANT en cart_items/orders/support_tickets: debe fallar con
-- "permission denied", ni siquiera llega a evaluarse RLS.
do $$
begin
  perform count(*) from public.cart_items;
  perform pg_temp.test_assert(false, 'anon NO debería poder consultar cart_items');
exception
  when insufficient_privilege then
    perform pg_temp.test_assert(true, 'anon consultar cart_items -> permission denied (' || sqlerrm || ')');
end $$;

do $$
begin
  perform count(*) from public.orders;
  perform pg_temp.test_assert(false, 'anon NO debería poder consultar orders');
exception
  when insufficient_privilege then
    perform pg_temp.test_assert(true, 'anon consultar orders -> permission denied (' || sqlerrm || ')');
end $$;

do $$
begin
  perform count(*) from public.support_tickets;
  perform pg_temp.test_assert(false, 'anon NO debería poder consultar support_tickets');
exception
  when insufficient_privilege then
    perform pg_temp.test_assert(true, 'anon consultar support_tickets -> permission denied (' || sqlerrm || ')');
end $$;

rollback;

-- =============================================================================
-- 2. Comprador: ve/edita SU carrito; no puede tocar el de otro.
-- =============================================================================
begin;

-- Fixture: como postgres (bypassa RLS), un ítem de carrito para buyer1 y otro
-- para buyer2.
insert into public.cart_items (user_id, product_id, quantity) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 1),
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000003', 1);

set local role authenticated;
set local request.jwt.claim.sub to '11111111-1111-1111-1111-111111111111';

do $$
declare
  v_own_count int;
  v_other_count int;
  v_rows_updated int;
begin
  select count(*) into v_own_count from public.cart_items where user_id = '11111111-1111-1111-1111-111111111111';
  perform pg_temp.test_assert(v_own_count = 1, 'buyer1 ve su propio ítem de carrito');

  select count(*) into v_other_count from public.cart_items where user_id = '22222222-2222-2222-2222-222222222222';
  perform pg_temp.test_assert(v_other_count = 0, 'buyer1 NO ve el carrito de buyer2 (RLS lo filtra, no error)');

  update public.cart_items set quantity = 5 where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics v_rows_updated = row_count;
  perform pg_temp.test_assert(v_rows_updated = 0, 'buyer1 intenta editar el carrito de buyer2 -> 0 filas afectadas');

  update public.cart_items set quantity = 3 where user_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics v_rows_updated = row_count;
  perform pg_temp.test_assert(v_rows_updated = 1, 'buyer1 edita SU propio ítem de carrito -> 1 fila afectada');
end $$;

rollback;

-- =============================================================================
-- 3. Comprador: no puede insertar reseña sin pedido 'entregado'; sí con él.
-- =============================================================================
begin;

set local role authenticated;
set local request.jwt.claim.sub to '22222222-2222-2222-2222-222222222222';

-- buyer2 no tiene ningún pedido 'entregado' que contenga a...0007.
do $$
begin
  insert into public.reviews (product_id, buyer_id, order_id, rating, comment)
  values ('a0000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222',
          'd0000000-0000-0000-0000-000000000002', 5, 'intento sin pedido entregado');
  perform pg_temp.test_assert(false, 'buyer2 NO debería poder reseñar sin pedido entregado del producto');
exception
  when insufficient_privilege or others then
    perform pg_temp.test_assert(true, 'buyer2 reseña sin pedido entregado -> rechazada por RLS (' || sqlerrm || ')');
end $$;

reset role;
reset request.jwt.claim.sub;

-- buyer1 SÍ tiene un pedido 'entregado' (d...0004) que contiene a...0011,
-- pero el seed ya insertó esa reseña (unique product_id+buyer_id) — se borra
-- primero como postgres para poder probar el INSERT limpio.
delete from public.reviews
  where product_id = 'a0000000-0000-0000-0000-000000000011'
    and buyer_id = '11111111-1111-1111-1111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub to '11111111-1111-1111-1111-111111111111';

do $$
declare
  v_rows int;
begin
  insert into public.reviews (product_id, buyer_id, order_id, rating, comment)
  values ('a0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111',
          'd0000000-0000-0000-0000-000000000004', 5, 'excelente router, prueba RLS');
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'buyer1 SÍ puede reseñar producto de pedido entregado propio');
end $$;

rollback;

-- =============================================================================
-- 4. Vendedor: CRUD de SUS productos; no puede editar productos ajenos.
-- =============================================================================
begin;

set local role authenticated;
set local request.jwt.claim.sub to '44444444-4444-4444-4444-444444444444';

do $$
declare
  v_rows int;
begin
  update public.products set description = 'actualizado por su dueño' where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'seller1 edita SU propio producto');

  update public.products set description = 'intento ajeno' where id = 'a0000000-0000-0000-0000-000000000009';
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 0, 'seller1 NO puede editar un producto de seller2 -> 0 filas afectadas');
end $$;

-- Intento de publicar un producto a nombre de otro vendedor (seller_id ajeno).
do $$
begin
  insert into public.products (seller_id, category_id, title, price)
  values ('55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000001', 'Producto suplantado', 100.00);
  perform pg_temp.test_assert(false, 'seller1 NO debería poder crear un producto a nombre de seller2');
exception
  when insufficient_privilege or others then
    perform pg_temp.test_assert(true, 'seller1 intenta suplantar seller_id ajeno -> rechazado (' || sqlerrm || ')');
end $$;

rollback;

-- =============================================================================
-- 5. Vendedor: ve pedidos que contienen sus ítems; no ve pedidos ajenos.
-- =============================================================================
begin;

set local role authenticated;
set local request.jwt.claim.sub to '44444444-4444-4444-4444-444444444444';

do $$
declare
  v_own_order int;
  v_foreign_order int;
begin
  select count(*) into v_own_order from public.orders where id = 'd0000000-0000-0000-0000-000000000001';
  perform pg_temp.test_assert(v_own_order = 1, 'seller1 ve el pedido d...0001 (contiene su producto)');

  select count(*) into v_foreign_order from public.orders where id = 'd0000000-0000-0000-0000-000000000003';
  perform pg_temp.test_assert(v_foreign_order = 0, 'seller1 NO ve el pedido d...0003 (solo tiene ítems de seller2)');
end $$;

rollback;

-- =============================================================================
-- 6. Vendedor: puede responder preguntas SOLO de sus productos.
-- =============================================================================
begin;

set local role authenticated;
set local request.jwt.claim.sub to '44444444-4444-4444-4444-444444444444';

do $$
declare
  v_rows int;
begin
  update public.questions
    set answer = 'Sí, es compatible con fuentes de 650W o superior.', answered_at = now()
    where product_id = 'a0000000-0000-0000-0000-000000000005' and answer is null;
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'seller1 responde una pregunta de SU producto (RTX 4070)');

  update public.questions
    set answer = 'intento ajeno', answered_at = now()
    where product_id = 'a0000000-0000-0000-0000-000000000013' and answer is null;
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 0, 'seller1 NO puede responder pregunta de producto de seller2 -> 0 filas');
end $$;

rollback;

-- =============================================================================
-- 7. Usuario: no puede cambiar su propio role.
-- =============================================================================
begin;

set local role authenticated;
set local request.jwt.claim.sub to '11111111-1111-1111-1111-111111111111';

do $$
begin
  update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';
  perform pg_temp.test_assert(false, 'buyer1 NO debería poder auto-promoverse a admin');
exception
  when others then
    perform pg_temp.test_assert(true, 'buyer1 intenta cambiar su propio role -> bloqueado por trigger (' || sqlerrm || ')');
end $$;

-- El trigger solo protege `role`; otras columnas del propio profile sí se
-- pueden editar, para confirmar que el bloqueo es específico y no general.
do $$
declare
  v_rows int;
begin
  update public.profiles set phone = '+51 900 111 222' where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'buyer1 SÍ puede editar otros campos de su propio profile (phone)');
end $$;

rollback;

-- =============================================================================
-- 8. Admin: puede moderar (borrar pregunta/reseña, editar support_articles).
-- =============================================================================
begin;

-- Fixture desechable como postgres, para no depender de filas específicas
-- del seed ni dejar huecos si este archivo se corre varias veces.
insert into public.questions (id, product_id, user_id, question)
values ('99999999-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'Pregunta desechable para probar moderación');

set local role authenticated;
set local request.jwt.claim.sub to '66666666-6666-6666-6666-666666666666';

do $$
declare
  v_rows int;
begin
  delete from public.questions where id = '99999999-0000-0000-0000-000000000001';
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'admin borra una pregunta ajena (moderación)');

  -- Reseña real del seed (buyer1 sobre a...0007), no una fixture desechable:
  -- no hay otro pedido 'entregado' libre para insertar una de prueba sin
  -- chocar con el unique(product_id, buyer_id) que ya sembró la Fase 2.5.
  delete from public.reviews
    where product_id = 'a0000000-0000-0000-0000-000000000007'
      and buyer_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'admin borra una reseña ajena (moderación)');

  update public.support_articles set is_published = false
    where title = '¿Cómo creo una cuenta en MercadoTech?';
  get diagnostics v_rows = row_count;
  perform pg_temp.test_assert(v_rows = 1, 'admin edita un support_article ajeno');
end $$;

rollback;

-- =============================================================================
-- 9. Checkout: create_order_from_cart falla con carrito vacío y con stock
-- insuficiente; éxito descuenta stock y vacía el carrito.
-- =============================================================================

-- 9a. Carrito vacío.
begin;
delete from public.cart_items where user_id = '22222222-2222-2222-2222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub to '22222222-2222-2222-2222-222222222222';

do $$
begin
  perform public.create_order_from_cart('22222222-2222-2222-2222-222222222222');
  perform pg_temp.test_assert(false, 'checkout con carrito vacío debería fallar');
exception
  when others then
    perform pg_temp.test_assert(true, 'checkout con carrito vacío -> falla (' || sqlerrm || ')');
end $$;

rollback;

-- 9b. Stock insuficiente (a...0008 tiene stock = 0 en el seed).
begin;
insert into public.cart_items (user_id, product_id, quantity) values
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000008', 1);

set local role authenticated;
set local request.jwt.claim.sub to '33333333-3333-3333-3333-333333333333';

do $$
begin
  perform public.create_order_from_cart('33333333-3333-3333-3333-333333333333');
  perform pg_temp.test_assert(false, 'checkout con stock insuficiente debería fallar');
exception
  when others then
    perform pg_temp.test_assert(true, 'checkout con stock insuficiente -> falla (' || sqlerrm || ')');
end $$;

rollback;

-- 9c. Checkout exitoso: descuenta stock y vacía el carrito.
begin;
delete from public.cart_items where user_id = '22222222-2222-2222-2222-222222222222';
insert into public.cart_items (user_id, product_id, quantity) values
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000006', 2);

set local role authenticated;
set local request.jwt.claim.sub to '22222222-2222-2222-2222-222222222222';

do $$
declare
  v_order_id uuid;
  v_stock_before int;
  v_stock_after int;
  v_cart_count int;
  v_item_count int;
begin
  select stock into v_stock_before from public.products where id = 'a0000000-0000-0000-0000-000000000006';

  v_order_id := public.create_order_from_cart('22222222-2222-2222-2222-222222222222');
  perform pg_temp.test_assert(v_order_id is not null, 'checkout exitoso devuelve un order_id');

  select stock into v_stock_after from public.products where id = 'a0000000-0000-0000-0000-000000000006';
  perform pg_temp.test_assert(v_stock_after = v_stock_before - 2, 'checkout descuenta el stock vendido (2 unidades)');

  select count(*) into v_cart_count from public.cart_items where user_id = '22222222-2222-2222-2222-222222222222';
  perform pg_temp.test_assert(v_cart_count = 0, 'checkout vacía el carrito del comprador');

  select count(*) into v_item_count from public.order_items where order_id = v_order_id;
  perform pg_temp.test_assert(v_item_count = 1, 'checkout crea el order_item con el snapshot');
end $$;

-- Suplantación: buyer2 no puede hacer checkout "a nombre de" buyer3.
do $$
begin
  perform public.create_order_from_cart('33333333-3333-3333-3333-333333333333');
  perform pg_temp.test_assert(false, 'checkout con p_buyer_id distinto de auth.uid() debería fallar');
exception
  when others then
    perform pg_temp.test_assert(true, 'checkout suplantando otro buyer_id -> falla (' || sqlerrm || ')');
end $$;

rollback;

-- =============================================================================
-- Fin. Si el script llegó hasta acá sin ningún "FAIL:", las 9 validaciones
-- mínimas de la Fase 2.6 quedaron confirmadas contra la base real.
-- =============================================================================
