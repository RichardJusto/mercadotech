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
