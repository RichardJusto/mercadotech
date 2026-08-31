import { test, expect } from "../fixtures/test";
import { ProductPage } from "../pages/ProductPage";

// Producto del seed con stock 0 ("Temporalmente sin stock" en la descripción).
const OUT_OF_STOCK_ID = "a0000000-0000-0000-0000-000000000008";

test("producto sin stock: el botón de agregar al carrito queda deshabilitado con el motivo visible", async ({
  page,
  loginAsBuyer1,
}) => {
  await loginAsBuyer1();
  const product = new ProductPage(page);
  await product.goto(OUT_OF_STOCK_ID);

  await expect(product.addToCartButton).toBeDisabled();
  await expect(product.disabledReason).toHaveText("Sin stock disponible.");
});

test("carrito vacío: muestra el EmptyState, no la lista con checkout", async ({
  page,
  loginAsBuyer1,
}) => {
  await loginAsBuyer1();
  await page.goto("/carrito");

  await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
  await expect(page.getByTestId("cart-checkout")).toHaveCount(0);
});

test("anónimo en /carrito: redirige a /login?redirectTo=/carrito", async ({ page }) => {
  await page.goto("/carrito");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fcarrito/);
});
