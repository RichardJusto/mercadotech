import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface McpContext {
  /** Cliente anon: respeta RLS igual que un visitante sin sesión. Default. */
  anon: SupabaseClient<Database>;
  /**
   * Cliente con service role: BYPASEA RLS por completo. Se usa SOLO donde
   * la tabla de la Fase 5.3/5.4 lo marca explícitamente (knowledge_embeddings,
   * orders/order_items, profiles) — nunca "admin para todo por comodidad".
   */
  admin: SupabaseClient<Database>;
}

// Fábrica POR LLAMADA, no singleton (lección 5): el servidor MCP puede
// vivir horas atendiendo un stdio; crear los clientes en cada invocación
// evita que credenciales o conexiones queden congeladas.
//
// Construye los clientes con @supabase/supabase-js directamente en vez de
// reutilizar lib/supabase/client.ts o lib/supabase/admin.ts (decisión 1):
// - lib/supabase/client.ts usa createBrowserClient de @supabase/ssr, pensado
//   para el navegador (storage/cookies de browser) — no aplica bajo Node.
// - lib/supabase/admin.ts vive en el árbol de la app Next; el MCP es un
//   proceso Node aparte y arma su propio cliente admin con las mismas
//   credenciales, igual que ya hace scripts/index-all.ts (lecciones 8-9).
// mcp/ nunca importa nada de app/, components/ ni hooks/.
export function createContext(): McpContext {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const anon = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { anon, admin };
}
