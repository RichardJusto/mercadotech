import { defineConfig, devices } from "@playwright/test";

// Los E2E corren contra Supabase LOCAL (`supabase start` + `supabase db
// reset`) — nunca contra el remoto. Antes de correr `npm run test:e2e`,
// asegurate de que el stack local esté arriba y el seed cargado.
const PORT = 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
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
