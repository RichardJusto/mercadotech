-- =============================================================================
-- SEED DE PRODUCCIÓN — Sesión 7, Fase 7.4
-- =============================================================================
-- A diferencia de supabase/seed.sql (seed de LABORATORIO: 6 usuarios con
-- contraseña conocida MercadoTech123!, ~16 productos falsos, pedidos y
-- tickets de ejemplo), este archivo es lo ÚNICO que se ejecuta contra el
-- proyecto Supabase de producción.
--
-- Contenido: 8 categorías + 10 artículos de FAQ reales (los mismos textos
-- de supabase/seed.sql — son contenido genuino, no datos de prueba, así que
-- se reutilizan). SIN usuarios, SIN productos, SIN pedidos, SIN tickets.
--
-- El catálogo de producción nace VACÍO a propósito: es el estado correcto
-- de un marketplace real el día del lanzamiento, antes de que el primer
-- vendedor se registre. Publicar productos falsos o usuarios con contraseña
-- pública en un proyecto accesible desde internet sería un error de
-- seguridad, no un atajo de conveniencia.
--
-- Cómo se aplica: UNA vez, pegando este archivo completo en el SQL Editor
-- del dashboard de Supabase del proyecto de producción (nunca con
-- `supabase db push`, que es solo para migraciones de esquema). Ver
-- docs/DEPLOY.md, sección "Despliegue", paso 3.
-- =============================================================================

-- =============================================================================
-- 1. CATEGORÍAS (8) — idénticas a las del seed de laboratorio: son taxonomía
-- real del catálogo, no datos de prueba.
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
-- 2. ARTÍCULOS DE SOPORTE / FAQ (10) — contenido real, se indexan para que
-- el asistente de /soporte pueda responder desde el día uno (ver paso 4 de
-- la Fase 7.4: correr scripts/index-all.ts UNA vez contra producción).
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
