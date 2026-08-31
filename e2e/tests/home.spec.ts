import { test, expect } from "../fixtures/test";
import { CatalogPage } from "../pages/CatalogPage";

// Smoke spec: prueba la tubería completa (webServer + Supabase local +
// seed) antes de escribir los flujos reales de 6.5/6.6. Verifica que el
// grid muestra productos — NO un título puntual: otros specs (seller-flow)
// publican productos nuevos con "más recientes" como orden por defecto, así
// que un título fijo del seed puede quedar empujado a la página 2 según qué
// haya corrido antes en la misma suite.
test("la home carga y muestra el grid de productos", async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();

  await expect(page.getByRole("heading", { name: "Todos los productos" })).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: "S/" }).first()).toBeVisible();
});
