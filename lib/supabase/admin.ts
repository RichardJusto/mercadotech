import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ADVERTENCIA: este cliente usa la service role key y BYPASEA Row Level
// Security por completo. Es exclusivamente de servidor: NUNCA importar este
// archivo desde un Client Component, un hook ni ningún código que pueda
// terminar en el bundle del navegador. Úsalo solo en Route Handlers,
// Server Actions o scripts server-only que necesiten privilegios de admin
// (p. ej. el trigger de creación de usuario, tareas de moderación).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
