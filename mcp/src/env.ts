import { readFileSync } from "node:fs";
import { join } from "node:path";

// Node no carga .env.local solo (Next sí, automáticamente) — lección 9 de
// la spec de la Sesión 5. Mismo patrón de parseo manual que ya usa
// scripts/index-all.ts (Sesión 4), reutilizado tal cual: una sola fuente
// de credenciales para toda la web y el MCP, sin .env propio en mcp/.
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let loaded = false;

export function loadEnvLocal(): void {
  if (loaded) return;
  loaded = true;

  try {
    // El servidor se lanza con `npx tsx mcp/src/index.ts` DESDE LA RAÍZ del
    // repo (decisión 7): process.cwd() es la raíz, igual que index-all.ts.
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Sin .env.local: la validación de abajo falla con un mensaje claro.
  }

  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}. ` +
        `Verificá que exista .env.local en la RAÍZ del repo y que el servidor ` +
        `se lance desde ahí (\`npx tsx mcp/src/index.ts\` desde la raíz, no desde mcp/).`,
    );
  }
}
