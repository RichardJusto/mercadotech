import { defineConfig, devices } from "@playwright/test";

// Los E2E corren contra Supabase LOCAL (`supabase start` + `supabase db
// reset`) — nunca contra el remoto. Antes de correr `npm run test:e2e`,
// asegurate de que el stack local esté arriba y el seed cargado.
const PORT = 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  // workers SIEMPRE 1 (no solo en CI): los specs comparten filas mutables
  // del mismo seed entre ARCHIVOS a propósito (el carrito de buyer1, el
  // pedido PAGADO_ORDER_ID que seller-flow y seller-negative mueven por el
  // kanban) — correrlos en paralelo produce carreras reales entre archivos
  // (ej. buyer-negative ve el carrito de buyer1 con ítems que buyer-flow
  // agregó a mitad de camino), no bugs de la app. Confirmado local: con
  // `workers: undefined` (paralelo, default de Playwright) fallan 3/8 de
  // forma no determinística; con `workers: 1` pasan 8/8 siempre.
  // `fullyParallel: true` queda igual — es inocuo con un solo worker.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["html"]] : [["html"], ["list"]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // En CI se corre contra la build de producción (paridad con lo que
  // realmente se despliega, decisión 12); en local se reutiliza el dev
  // server si ya está arriba (patrón ReadHub — evita levantar uno nuevo).
  webServer: {
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
