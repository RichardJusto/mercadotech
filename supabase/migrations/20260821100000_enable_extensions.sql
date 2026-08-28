-- La spec no especifica el mecanismo de generación de UUIDs. gen_random_uuid()
-- ya es nativo en PostgreSQL 13+ (no requiere pgcrypto), pero se fija la
-- extensión igual, en el schema `extensions` (convención estándar de
-- Supabase), para no depender de la versión exacta del motor y para tener
-- disponibles otras funciones criptográficas si hicieran falta más adelante.
create extension if not exists pgcrypto with schema extensions;
