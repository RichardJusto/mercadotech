import { defineConfig } from "vitest/config";
import path from "node:path";

// Sin tests de componentes en esta sesión (decisión 6): environment "node",
// nada de jsdom ni Testing Library.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "mcp/**", "e2e/**", ".next/**"],
    // Hallazgo Fase 6.3: getPublicUrl (services/storage.service.ts) tiene un
    // default `createClient()` que se cuela cuando funciones no-inyectables
    // como mapProductRow lo llaman sin pasar el cliente — createBrowserClient
    // explota sin estas dos env vars. getPublicUrl arma la URL en LOCAL (no
    // hace red), así que valores dummy no rompen "cero red" en los tests.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["lib/**", "services/**"],
    },
  },
});
