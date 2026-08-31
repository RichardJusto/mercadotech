import { test, expect } from "../fixtures/test";
import { SellerKanbanPage } from "../pages/SellerKanbanPage";

const PAGADO_ORDER_ID = "d0000000-0000-0000-0000-000000000002";
// Mismo valor determinado empíricamente en seller-flow.spec.ts.
const ARROW_PRESSES_TO_CROSS_COLUMN = 20;

test("buyer1 no puede entrar al panel de vendedor", async ({ page, loginAsBuyer1 }) => {
  await loginAsBuyer1();
  await page.goto("/vendedor/productos");

  await expect(page.getByText("Necesitas una cuenta de vendedor")).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("mover un pedido enviado de vuelta a pagado: la UI lo rechaza y la tarjeta no cambia", async ({
  page,
  loginAsSeller1,
}) => {
  await loginAsSeller1();
  const kanban = new SellerKanbanPage(page);
  await kanban.goto();

  // Este spec y seller-flow.spec.ts mutan el MISMO pedido del seed (es el
  // único 'pagado' con un ítem de seller1) — en una suite completa sin
  // reset entre archivos (así corre en CI: un solo `db reset` antes de
  // TODA la suite), puede que seller-flow ya lo haya adelantado a
  // 'enviado'. El setup es idempotente: solo mueve si hace falta.
  await test.step("setup: garantiza que el pedido esté en 'enviado'", async () => {
    // Espera a que el kanban termine de cargar (la tarjeta exista en
    // CUALQUIER columna) antes de decidir si hace falta moverla — isVisible()
    // no espera, así que preguntarle antes de que useSellerOrders termine de
    // cargar la haría creer que falta mover cuando en realidad no cargó aún.
    await expect(kanban.card(PAGADO_ORDER_ID)).toBeVisible();
    const yaEnviado = await kanban
      .column("enviado")
      .getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)
      .isVisible();
    if (!yaEnviado) {
      await kanban.moveRightByKeyboard(PAGADO_ORDER_ID, ARROW_PRESSES_TO_CROSS_COLUMN);
    }
    await expect(kanban.column("enviado").getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)).toBeVisible();
  });

  await test.step("intenta retroceder enviado -> pagado: se rechaza", async () => {
    const card = kanban.card(PAGADO_ORDER_ID);
    await card.focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < ARROW_PRESSES_TO_CROSS_COLUMN; i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await page.keyboard.press("Space");

    await expect(page.getByText("Solo puedes avanzar el pedido un paso a la vez.")).toBeVisible();
    await expect(kanban.column("enviado").getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)).toBeVisible();
    await expect(kanban.column("pagado").getByTestId(`kanban-card-${PAGADO_ORDER_ID}`)).toHaveCount(0);
  });
});
