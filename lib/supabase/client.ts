import { createBrowserClient } from "@supabase/ssr";

// TODO(Fase 2.2+): tipar con <Database> desde types/database.ts una vez
// exista el esquema y se genere con `supabase gen types typescript`.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
