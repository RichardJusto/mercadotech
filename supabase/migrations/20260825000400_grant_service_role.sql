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
