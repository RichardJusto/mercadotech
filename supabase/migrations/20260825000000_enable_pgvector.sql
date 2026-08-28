-- Fase 4.1 (sesión 4): extensión pgvector, en `extensions` (no en `public`),
-- mismo patrón que pgcrypto en la Fase 2.2.
create extension if not exists vector with schema extensions;
