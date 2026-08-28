-- =============================================================================
-- seed.sql — Fase 2.5. Datos de prueba para desarrollo local.
-- Se aplica automáticamente después de las migraciones en `supabase db reset`.
-- Contraseña de laboratorio para TODOS los usuarios: MercadoTech123!
--
-- NOTA IMPORTANTE (gap conocido, documentado desde el día uno): los
-- `image_path` insertados en product_images más abajo son rutas coherentes
-- con la convención del bucket `product-images`, pero los ARCHIVOS NO EXISTEN
-- en Storage — nadie los subió todavía. Hay que subirlos manualmente desde la
-- UI (sesión 3) o con un script aparte; hasta entonces esas URLs de imagen
-- devuelven 404. Mismo patrón que se detectó tarde en ReadHub.
-- =============================================================================

-- =============================================================================
-- 1. USUARIOS (auth.users + auth.identities)
-- El trigger handle_new_user (Fase 2.2) crea el profile automáticamente al
-- insertar en auth.users, tomando display_name de raw_user_meta_data. El rol
-- default es 'buyer'; para seller/admin se corrige después con un UPDATE,
-- desactivando momentáneamente el trigger protect_profiles_role (Fase 2.3)
-- porque bloquea justamente ese tipo de cambio si quien lo hace no es admin
-- — y en este script no hay sesión autenticada de por medio.
-- =============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'buyer1@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"display_name":"Ana Torres"}', now() - interval '90 days', now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'buyer2@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"display_name":"Carlos Medina"}', now() - interval '80 days', now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'buyer3@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"display_name":"Lucía Fernández"}', now() - interval '70 days', now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'seller1@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"display_name":"TechZone Perú"}', now() - interval '120 days', now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'seller2@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"display_name":"Digital World"}', now() - interval '110 days', now()),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated',
   'admin@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"display_name":"Admin MercadoTech"}', now() - interval '150 days', now());

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"buyer1@mercadotech.test"}', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"buyer2@mercadotech.test"}', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'email',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"buyer3@mercadotech.test"}', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'email',
   '{"sub":"44444444-4444-4444-4444-444444444444","email":"seller1@mercadotech.test"}', now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'email',
   '{"sub":"55555555-5555-5555-5555-555555555555","email":"seller2@mercadotech.test"}', now(), now(), now()),
  ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'email',
   '{"sub":"66666666-6666-6666-6666-666666666666","email":"admin@mercadotech.test"}', now(), now(), now());

alter table public.profiles disable trigger protect_profiles_role;

update public.profiles set role = 'seller', phone = '+51 999 111 222'
  where id in ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555');
update public.profiles set role = 'admin', phone = '+51 999 000 000'
  where id = '66666666-6666-6666-6666-666666666666';
update public.profiles set phone = '+51 999 333 444' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set phone = '+51 999 555 666' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set phone = '+51 999 777 888' where id = '33333333-3333-3333-3333-333333333333';

alter table public.profiles enable trigger protect_profiles_role;

-- =============================================================================
-- 2. CATEGORÍAS (8)
-- =============================================================================

insert into public.categories (id, name, slug) values
  ('c0000000-0000-0000-0000-000000000001', 'Laptops', 'laptops'),
  ('c0000000-0000-0000-0000-000000000002', 'Smartphones', 'smartphones'),
  ('c0000000-0000-0000-0000-000000000003', 'Componentes de PC', 'componentes-pc'),
  ('c0000000-0000-0000-0000-000000000004', 'Audio', 'audio'),
  ('c0000000-0000-0000-0000-000000000005', 'Gaming', 'gaming'),
  ('c0000000-0000-0000-0000-000000000006', 'Monitores', 'monitores'),
  ('c0000000-0000-0000-0000-000000000007', 'Accesorios', 'accesorios'),
  ('c0000000-0000-0000-0000-000000000008', 'Redes', 'redes');

-- =============================================================================
-- 3. PRODUCTOS (16: 8 de seller1 TechZone, 8 de seller2 Digital World)
-- 2 inactivos (#2 y #16) + 1 con stock 0 (#8), para probar filtros y checkout.
-- =============================================================================

insert into public.products (id, seller_id, category_id, title, description, brand, condition, price, stock, is_active) values
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000001',
   'Laptop Dell XPS 13', 'Ultrabook de 13", pantalla InfinityEdge, Intel Core i7 de 13ª generación, 16GB RAM, SSD 512GB.', 'Dell', 'nuevo', 4299.00, 12, true),
  ('a0000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000001',
   'Laptop Lenovo ThinkPad E14', 'Modelo descontinuado, Intel Core i5 11ª gen, 8GB RAM, SSD 256GB. Ya no se fabrica.', 'Lenovo', 'nuevo', 3199.00, 5, false),
  ('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000002',
   'iPhone 14 128GB', 'Chip A15 Bionic, cámara dual de 12MP, pantalla Super Retina XDR de 6.1".', 'Apple', 'nuevo', 3599.00, 15, true),
  ('a0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000002',
   'Samsung Galaxy S23', 'Snapdragon 8 Gen 2, 8GB RAM, 256GB, pantalla Dynamic AMOLED 2X de 6.1".', 'Samsung', 'nuevo', 3299.00, 10, true),
  ('a0000000-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000003',
   'Tarjeta gráfica RTX 4070', '12GB GDDR6X, ray tracing de 3ª generación, DLSS 3.', 'NVIDIA', 'nuevo', 2899.00, 6, true),
  ('a0000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000003',
   'SSD NVMe 1TB Samsung 980', 'Velocidad de lectura hasta 3500 MB/s, interfaz PCIe 3.0 x4.', 'Samsung', 'nuevo', 349.00, 30, true),
  ('a0000000-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000004',
   'Audífonos Sony WH-1000XM5', 'Cancelación de ruido líder en la industria, 30 horas de batería.', 'Sony', 'nuevo', 1299.00, 20, true),
  ('a0000000-0000-0000-0000-000000000008', '44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000005',
   'Teclado mecánico Logitech G Pro', 'Switches GX Blue clicky, formato TKL, retroiluminación RGB. Temporalmente sin stock.', 'Logitech', 'nuevo', 449.00, 0, true),
  ('a0000000-0000-0000-0000-000000000009', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000006',
   'Monitor LG UltraGear 27" 144Hz', 'Panel IPS QHD, 1ms GtG, compatible con NVIDIA G-Sync y AMD FreeSync.', 'LG', 'nuevo', 999.00, 14, true),
  ('a0000000-0000-0000-0000-000000000010', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000006',
   'Monitor Samsung Odyssey G5', 'Curvo 27" QHD, 165Hz, panel VA.', 'Samsung', 'nuevo', 899.00, 9, true),
  ('a0000000-0000-0000-0000-000000000011', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000008',
   'Router Wi-Fi 6 TP-Link Archer AX55', 'AX3000, doble banda, 6 antenas de alta ganancia, soporta mesh OneMesh.', 'TP-Link', 'nuevo', 349.00, 25, true),
  ('a0000000-0000-0000-0000-000000000012', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000008',
   'Switch Gigabit 8 puertos TP-Link', 'Switch no administrable, carcasa metálica, plug and play.', 'TP-Link', 'nuevo', 149.00, 40, true),
  ('a0000000-0000-0000-0000-000000000013', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000007',
   'Mouse gamer Razer DeathAdder V3', 'Sensor óptico Focus Pro 30K, 8000Hz de polling, cable ligero.', 'Razer', 'nuevo', 199.00, 35, true),
  ('a0000000-0000-0000-0000-000000000014', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000007',
   'Cargador USB-C 65W Anker', 'GaN II, carga rápida para laptop, tablet y celular en un solo puerto.', 'Anker', 'nuevo', 89.00, 50, true),
  ('a0000000-0000-0000-0000-000000000015', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000005',
   'Consola PlayStation 5', 'Reacondicionada certificada, incluye un control DualSense, garantía de 6 meses.', 'Sony', 'reacondicionado', 2199.00, 4, true),
  ('a0000000-0000-0000-0000-000000000016', '55555555-5555-5555-5555-555555555555', 'c0000000-0000-0000-0000-000000000005',
   'Silla gamer Secretlab usada', 'Modelo Titan, un año de uso, buen estado. Retirada de catálogo tras venderse la unidad.', 'Secretlab', 'usado', 899.00, 3, false);

-- =============================================================================
-- 4. PRODUCT_IMAGES (2-3 por producto). Rutas coherentes con el bucket
-- `product-images` ({seller_id}/{product_id}/{n}.{ext}) — ver nota al inicio:
-- los archivos NO están subidos a Storage todavía.
-- =============================================================================

insert into public.product_images (product_id, image_path, position)
select
  p.id,
  p.seller_id || '/' || p.id || '/' || n || '.jpg',
  n - 1
from public.products p
cross join generate_series(1, 2) as n;

-- El producto insignia de cada vendedor lleva una tercera foto.
insert into public.product_images (product_id, image_path, position) values
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444/a0000000-0000-0000-0000-000000000001/3.jpg', 2),
  ('a0000000-0000-0000-0000-000000000009', '55555555-5555-5555-5555-555555555555/a0000000-0000-0000-0000-000000000009/3.jpg', 2);

-- =============================================================================
-- 5. PEDIDOS + ORDER_ITEMS (1 por estado como mínimo; 2 'entregado' para dar
-- base a las reseñas). Los snapshots (title/price) son inserción manual
-- directa, no pasan por create_order_from_cart — es data histórica de seed,
-- no una simulación de compra.
-- =============================================================================

insert into public.orders (id, buyer_id, status, total, created_at) values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pendiente', 4299.00, now() - interval '2 days'),
  ('d0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'pagado', 3997.00, now() - interval '5 days'),
  ('d0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'enviado', 999.00, now() - interval '7 days'),
  ('d0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'entregado', 1648.00, now() - interval '20 days'),
  ('d0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'cancelado', 2899.00, now() - interval '15 days'),
  ('d0000000-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', 'entregado', 2199.00, now() - interval '30 days');

insert into public.order_items (order_id, product_id, seller_id, title_snapshot, price_snapshot, quantity) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Laptop Dell XPS 13', 4299.00, 1),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'iPhone 14 128GB', 3599.00, 1),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000013', '55555555-5555-5555-5555-555555555555', 'Mouse gamer Razer DeathAdder V3', 199.00, 2),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', '55555555-5555-5555-5555-555555555555', 'Monitor LG UltraGear 27" 144Hz', 999.00, 1),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', 'Audífonos Sony WH-1000XM5', 1299.00, 1),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000011', '55555555-5555-5555-5555-555555555555', 'Router Wi-Fi 6 TP-Link Archer AX55', 349.00, 1),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', 'Tarjeta gráfica RTX 4070', 2899.00, 1),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000015', '55555555-5555-5555-5555-555555555555', 'Consola PlayStation 5', 2199.00, 1);

-- =============================================================================
-- 6. PREGUNTAS (8: 5 respondidas, 3 sin responder)
-- =============================================================================

insert into public.questions (product_id, user_id, question, answer, answered_at, created_at) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '¿Incluye el cargador original?', 'Sí, incluye el cargador original de 90W en la caja.', now() - interval '9 days', now() - interval '10 days'),
  ('a0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '¿Tiene garantía de fábrica?', 'Sí, 1 año de garantía Apple internacional.', now() - interval '11 days', now() - interval '12 days'),
  ('a0000000-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', '¿Cuál es el tiempo de respuesta del panel?', '1ms GtG (Gray to Gray).', now() - interval '4 days', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', '¿Qué incluye la consola reacondicionada?', 'Consola, un control DualSense y cable de corriente. El cable HDMI se vende aparte.', now() - interval '3 days', now() - interval '4 days'),
  ('a0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '¿Soporta modo mesh con otros routers TP-Link?', 'Sí, es compatible con la red OneMesh de TP-Link.', now() - interval '6 days', now() - interval '7 days'),
  ('a0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', '¿Es compatible con una fuente de poder de 650W?', null, null, now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000013', '33333333-3333-3333-3333-333333333333', '¿Es un mouse inalámbrico o con cable?', null, null, now() - interval '1 days'),
  ('a0000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', '¿Cuánto dura la batería con cancelación de ruido activa?', null, null, now() - interval '3 days');

-- =============================================================================
-- 7. RESEÑAS (solo sobre pedidos 'entregado' que contienen el producto)
-- =============================================================================

insert into public.reviews (product_id, buyer_id, order_id, rating, comment, created_at) values
  ('a0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000004', 5, 'Excelente cancelación de ruido, superó mis expectativas. Muy cómodos para usar todo el día.', now() - interval '18 days'),
  ('a0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000004', 4, 'Buen router, fácil de configurar. Le resto una estrella porque el rango en 5GHz es un poco corto.', now() - interval '17 days'),
  ('a0000000-0000-0000-0000-000000000015', '33333333-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000006', 5, 'Llegó impecable, no se nota que es reacondicionada. Muy buena atención del vendedor.', now() - interval '28 days');

-- =============================================================================
-- 8. FAVORITOS (muestra)
-- =============================================================================

insert into public.favorites (user_id, product_id) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000007'),
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000015'),
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000003'),
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000009'),
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000005'),
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000013');

-- =============================================================================
-- 9. PRODUCT_VIEWS (muestra de eventos)
-- =============================================================================

insert into public.product_views (product_id, user_id, viewed_at) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now() - interval '3 days'),
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '6 days'),
  ('a0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', now() - interval '12 days'),
  ('a0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', now() - interval '19 days'),
  ('a0000000-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', now() - interval '21 days'),
  ('a0000000-0000-0000-0000-000000000013', '33333333-3333-3333-3333-333333333333', now() - interval '1 days'),
  ('a0000000-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', now() - interval '4 days'),
  ('a0000000-0000-0000-0000-000000000015', '33333333-3333-3333-3333-333333333333', now() - interval '31 days');

-- =============================================================================
-- 10. SUPPORT_ARTICLES (10, contenido real, 4 categorías)
-- =============================================================================

insert into public.support_articles (title, content, category, is_published) values
(
  '¿Cuánto tarda en llegar mi pedido?',
  'El tiempo de entrega depende de la ubicación del vendedor y la tuya. En general, los pedidos dentro de la misma ciudad llegan entre 1 y 3 días hábiles, mientras que los envíos a otras regiones pueden tomar entre 3 y 7 días hábiles. Una vez que el vendedor despacha el paquete, el pedido cambia a estado "enviado" y podrás ver el avance desde la sección "Mis pedidos".

Si tu pedido lleva más de 7 días hábiles en estado "pagado" sin pasar a "enviado", te recomendamos contactar primero al vendedor desde la página del pedido. Si no obtienes respuesta en 48 horas, puedes abrir un ticket de soporte y nuestro equipo intervendrá directamente.',
  'envíos', true
),
(
  '¿Cómo rastreo mi pedido?',
  'Una vez que tu pedido cambia a estado "enviado", el vendedor debe registrar la información de envío correspondiente. Podrás ver el estado actualizado directamente en la sección "Mis pedidos" de tu cuenta, sin necesidad de páginas externas.

Los estados posibles son: pendiente (esperando pago), pagado (pago confirmado, en preparación), enviado (despachado por el vendedor), entregado (recibido por ti) y cancelado. Si tienes dudas sobre en qué etapa se encuentra tu pedido, el historial completo queda siempre visible en el detalle del pedido.',
  'envíos', true
),
(
  '¿Qué hago si mi pedido llega dañado o incompleto?',
  'Si tu pedido llega con el producto dañado, incompleto o distinto a lo publicado, no lo uses y conserva el empaque original junto con las fotos del estado en que llegó. Esto es fundamental para agilizar cualquier reclamo.

Abre un ticket de soporte describiendo el problema y adjunta las fotos que tomaste. Nuestro equipo revisará el caso junto con el vendedor y coordinará el reemplazo, la devolución del dinero o el cambio, según corresponda a la política de cada situación. Todo pedido dañado en tránsito está cubierto siempre que se reporte dentro de las 48 horas posteriores a la entrega.',
  'envíos', true
),
(
  '¿Qué métodos de pago acepta MercadoTech?',
  'Aceptamos tarjetas de crédito y débito Visa y Mastercard, así como transferencias bancarias directas. El pago se procesa de forma segura al momento de confirmar tu pedido, y el dinero queda retenido hasta que el vendedor confirma el despacho, como protección tanto para compradores como para vendedores.

No almacenamos los datos completos de tu tarjeta en nuestros servidores: el procesamiento lo realiza una pasarela de pagos certificada. Si tu pago es rechazado, revisa que los datos ingresados coincidan exactamente con los de tu banco, o intenta con otro método antes de contactar a soporte.',
  'pagos', true
),
(
  '¿Por qué se cobró dos veces el mismo pedido?',
  'Un doble cobro casi siempre corresponde a una retención temporal de tu banco, no a un cobro real duplicado. Cuando intentas pagar y la primera solicitud tarda en confirmarse, algunos bancos muestran una preautorización mientras se procesa, que desaparece automáticamente en un plazo de 3 a 5 días hábiles si el pedido solo se generó una vez.

Puedes confirmar cuántos pedidos reales se crearon revisando la sección "Mis pedidos": si aparece un solo pedido con estado "pagado", el cobro fue único y la duplicación que ves en tu banco es temporal. Si efectivamente ves dos pedidos idénticos confirmados, abre un ticket de soporte con el número de ambos pedidos para que gestionemos la devolución del cobro duplicado.',
  'pagos', true
),
(
  '¿Puedo pagar en cuotas?',
  'La disponibilidad de pago en cuotas depende del banco emisor de tu tarjeta de crédito, no de MercadoTech directamente. Si tu tarjeta lo permite, la opción de cuotas aparecerá automáticamente en la pantalla de pago al momento de hacer el checkout.

Actualmente no ofrecemos financiamiento propio ni cuotas sin tarjeta. Las tarjetas de débito y las transferencias bancarias siempre se procesan como pago único, sin opción de fraccionamiento.',
  'pagos', true
),
(
  '¿Cómo solicito la devolución de un producto?',
  'Puedes solicitar la devolución de un producto dentro de los 7 días calendario posteriores a la entrega, siempre que esté en las mismas condiciones en que lo recibiste, con su empaque original y accesorios completos. Ingresa al detalle del pedido entregado y abre un ticket de soporte indicando el motivo de la devolución.

Una vez aprobada la solicitud, coordinaremos la recolección o el envío del producto de vuelta al vendedor. El reembolso se procesa al método de pago original una vez que el vendedor confirma la recepción del producto devuelto, en un plazo máximo de 10 días hábiles.',
  'devoluciones', true
),
(
  '¿Cuánto tarda en procesarse mi reembolso?',
  'Una vez que el vendedor confirma la recepción del producto devuelto en buen estado, el reembolso se inicia de inmediato hacia tu método de pago original. Si pagaste con tarjeta, el banco emisor puede tardar entre 5 y 10 días hábiles adicionales en reflejar el monto en tu estado de cuenta, dependiendo de sus propios tiempos de procesamiento.

Si pagaste por transferencia bancaria, el reembolso se realiza directamente a la cuenta de origen y suele reflejarse en un plazo de 3 a 5 días hábiles. Puedes seguir el estado de tu solicitud de devolución desde el ticket de soporte que abriste para gestionarla.',
  'devoluciones', true
),
(
  '¿Cómo creo una cuenta en MercadoTech?',
  'Para crear una cuenta, haz clic en "Registrarse" e ingresa tu correo electrónico, un nombre para mostrar y una contraseña. Recibirás un correo de confirmación; una vez que confirmes tu dirección de correo, tu cuenta quedará activa y podrás comprar de inmediato.

Si quieres vender productos en la plataforma, tu cuenta se crea inicialmente como comprador; puedes solicitar la conversión a cuenta de vendedor desde la sección "Configuración de cuenta", proceso que valida nuestro equipo antes de habilitar la publicación de productos.',
  'cuenta', true
),
(
  '¿Cómo cambio mi contraseña o recupero el acceso a mi cuenta?',
  'Si tienes acceso a tu cuenta, puedes cambiar tu contraseña desde "Configuración de cuenta > Seguridad", ingresando tu contraseña actual y la nueva. Si olvidaste tu contraseña, usa la opción "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión: te enviaremos un enlace de recuperación al correo registrado, válido por 1 hora.

Por seguridad, ese enlace de recuperación solo funciona una vez. Si no te llega el correo, revisa la carpeta de spam antes de solicitar uno nuevo, y asegúrate de estar consultando la bandeja del correo con el que te registraste originalmente.',
  'cuenta', true
);

-- =============================================================================
-- 11. SUPPORT_TICKETS + TICKET_MESSAGES (2 tickets con conversación)
-- =============================================================================

insert into public.support_tickets (id, user_id, subject, status, channel, created_at) values
  ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Mi pedido no ha llegado', 'en_proceso', 'chat', now() - interval '4 days'),
  ('e0000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Problema con el reembolso de una devolución', 'abierto', 'voz', now() - interval '1 days');

insert into public.ticket_messages (ticket_id, sender_role, content, created_at) values
  ('e0000000-0000-0000-0000-000000000001', 'usuario', 'Hola, mi pedido lleva 4 días en estado "pagado" y todavía no cambia a "enviado". ¿Pueden ayudarme?', now() - interval '4 days'),
  ('e0000000-0000-0000-0000-000000000001', 'humano', 'Hola Carlos, gracias por escribirnos. Contactamos al vendedor para que confirme el despacho; te avisamos apenas tengamos novedades.', now() - interval '3 days'),
  ('e0000000-0000-0000-0000-000000000001', 'usuario', 'Perfecto, quedo atento. Gracias.', now() - interval '3 days'),
  ('e0000000-0000-0000-0000-000000000002', 'usuario', 'Devolví un producto hace 10 días y todavía no veo el reembolso reflejado.', now() - interval '1 days'),
  ('e0000000-0000-0000-0000-000000000002', 'agente', 'Estamos revisando el estado de tu devolución con el equipo de pagos, te confirmamos en breve.', now() - interval '1 days');
