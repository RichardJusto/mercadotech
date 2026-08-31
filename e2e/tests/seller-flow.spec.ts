import path from "node:path";
import { test, expect } from "../fixtures/test";
import { CatalogPage } from "../pages/CatalogPage";
import { SellerProductsPage } from "../pages/SellerProductsPage";
import { SellerKanbanPage } from "../pages/SellerKanbanPage";
import { OrdersPage } from "../pages/OrdersPage";
import { LoginPage } from "../pages/LoginPage";
import { buyer2 } from "../data/users";

const IMAGE_PATH = path.join(__dirname, "..", "data", "product-image.jpg");
// Pedido 'pagado' del seed con un ítem de seller1 (Techzone Perú) y otro de
// seller2 (pedido multi-vendedor) — comprador: buyer2.
const PAGADO_ORDER_ID = "d0000000-0000-0000-0000-000000000002";

test("flujo vendedor: publicar producto y mover un pedido por el kanban (teclado)", async ({
  page,
  loginAsSeller1,
}) => {
  const sellerProducts = new SellerProductsPage(page);
  const catalog = new CatalogPage(page);
  const kanban = new SellerKanbanPage(page);

  await test.step("login seller1 -> panel", async () => {
    await loginAsSeller1();
    await sellerProducts.goto();
    await expect(page.getByRole("heading", { name: "Mis productos" })).toBeVisible();
  });

  const uniqueTitle = `Producto E2E ${Date.now()}`;

  await test.step("publica un producto con imagen (título único por timestamp)", async () => {
    await sellerProducts.gotoPublish();
    await sellerProducts.fillAndSubmit({
      title: uniqueTitle,
      description: "Producto creado por el E2E de la Fase 6.6.",
      brand: "E2E",
      price: 99.9,
      stock: 5,
      condition: "Nuevo",
      categoryName: "Accesorios",
      imagePath: IMAGE_PATH,
    });
    await expect(page).toHaveURL(/\/vendedor\/productos\/.+\/editar/);
  });

  await test.step("aparece en su tabla Y en el catálogo público", async () => {
    await sellerProducts.goto();
    await expect(sellerProducts.row(uniqueTitle)).toBeVisible();

    await catalog.goto();
    await expect(catalog.productLink(uniqueTitle)).toBeVisible();
  });

  await test.step("kanban: mueve el pedido pagado a enviado por teclado", async () => {
    await kanban.goto();
    await expect(kanban.card(PAGADO_ORDER_ID)).toBeVisible();

    // Camino de teclado de dnd-kit/core (decisión 9): SellerKanbanPage mide
    // la posición real de la tarjeta y de la columna destino para calcular
    // cuántas veces hace falta apretar la flecha — no un número fijo (mueve
    // por píxeles, no por posición de lista, a diferencia de la galería de
    // imágenes de 6.4).
    await kanban.moveToColumn(PAGADO_ORDER_ID, "enviado");

    await expect(kanban.column("enviado").getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)).toBeVisible();
  });

  await test.step("la tarjeta persiste tras recargar", async () => {
    await page.reload();
    await expect(kanban.column("enviado").getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)).toBeVisible();
    await expect(kanban.column("pagado").getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)).toHaveCount(0);
  });

  await test.step("login como el comprador de ese pedido -> su detalle muestra enviado", async () => {
    // El panel de vendedor (app/(seller)/layout.tsx) es un layout aparte,
    // solo sidebar, SIN navbar ni logout — hay que volver a una ruta de
    // (shop) primero para tener el UserMenu disponible.
    await page.goto("/");
    await page.getByTestId("navbar-user-menu").click();
    const logout = page.getByTestId("navbar-logout");
    await expect(logout).toBeVisible();
    await logout.click();
    await page.waitForURL("/");

    const orders = new OrdersPage(page);
    const login = new LoginPage(page);
    await login.goto();
    await login.login(buyer2);
    await page.waitForURL("/");

    await orders.gotoOrder(PAGADO_ORDER_ID);
    await expect(orders.statusBadge).toHaveText("Enviado");
  });
});
