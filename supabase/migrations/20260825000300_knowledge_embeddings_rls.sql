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
