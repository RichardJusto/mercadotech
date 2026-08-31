import { test, expect } from "../fixtures/test";
import { CatalogPage } from "../pages/CatalogPage";
import { ProductPage } from "../pages/ProductPage";
import { CartPage } from "../pages/CartPage";
import { OrdersPage } from "../pages/OrdersPage";
import { formatPrice } from "../../lib/utils";

// Producto real del seed, categoría "Laptops" (slug laptops), con stock.
const LAPTOP_ID = "a0000000-0000-0000-0000-000000000001";
const LAPTOP_TITLE = "Laptop Dell XPS 13";
const LAPTOP_PRICE = 4299;

test("flujo comprador: buscar, agregar al carrito y comprar", async ({ page, loginAsBuyer1 }) => {
  const catalog = new CatalogPage(page);
  const product = new ProductPage(page);
  const cart = new CartPage(page);
  const orders = new OrdersPage(page);

  await test.step("login como buyer1 -> catálogo con su menú de usuario", async () => {
    await loginAsBuyer1();
    await expect(page.getByTestId("navbar-user-menu")).toBeVisible();
  });

  await test.step("filtra 'Laptops' -> el grid solo muestra laptops", async () => {
    await catalog.gotoCategory("laptops");
    // El <h1> depende de useCategories() (fetch client-side, sin datos de
    // SSR): en un runner más lento puede tardar más que el timeout default
    // de 5s en pasar de "Categoría" (fallback) al nombre real.
    await expect(page.getByRole("heading", { name: "Laptops" })).toBeVisible({ timeout: 10000 });
    await expect(catalog.productLink(LAPTOP_TITLE)).toBeVisible();
  });

  await test.step("abre un producto con stock -> galería y precio", async () => {
    await product.goto(LAPTOP_ID);
    await expect(page.getByRole("heading", { name: LAPTOP_TITLE })).toBeVisible();
    await expect(page.getByText(formatPrice(LAPTOP_PRICE))).toBeVisible();
    await expect(product.addToCartButton).toBeEnabled();
  });

  // Hallazgo real (no se corrige acá — restricción de la sesión: ningún
  // cambio de lógica de producción salvo el helper del kanban y los
  // data-testid): el badge del navbar y la mutación del carrito usan
  // instancias SEPARADAS de useCart (una en app/(shop)/layout.tsx, otra en
  // la página de producto) sin estado ni caché compartidos — agregar al
  // carrito no refresca el badge en vivo. Se confirma el conteo recargando,
  // que sí dispara un remount del layout y un refetch real contra la BD.
  await test.step("agrega 2 unidades -> el contador del navbar queda en 2 (tras recargar)", async () => {
    await product.addToCart(2);
    await expect(page.getByText("Agregado al carrito")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText("2");
  });

  let orderId = "";

  await test.step("carrito -> subtotal correcto -> Finalizar compra", async () => {
    await cart.goto();
    await expect(cart.items).toHaveCount(1);
    await expect(cart.subtotalRow).toContainText(formatPrice(LAPTOP_PRICE * 2));
    orderId = await cart.checkout();
    expect(orderId).toBeTruthy();
  });

  await test.step("redirige a /pedidos/[id] -> estado pendiente, ítems snapshot", async () => {
    await expect(page).toHaveURL(new RegExp(`/pedidos/${orderId}`));
    await expect(orders.statusBadge).toHaveText("Pendiente");
    await expect(page.getByText(LAPTOP_TITLE)).toBeVisible();
  });

  await test.step("'Mis pedidos' lista ese pedido, identificado por id", async () => {
    await orders.goto();
    await expect(orders.orderCard(orderId)).toBeVisible();
  });

  await test.step("logout -> navbar anónimo", async () => {
    await page.getByTestId("navbar-user-menu").click();
    const logout = page.getByTestId("navbar-logout");
    await expect(logout).toBeVisible();
    await logout.click();
    await expect(page.getByTestId("navbar-login-link")).toBeVisible();
  });
});
