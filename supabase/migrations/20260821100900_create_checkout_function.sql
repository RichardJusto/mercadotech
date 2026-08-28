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
