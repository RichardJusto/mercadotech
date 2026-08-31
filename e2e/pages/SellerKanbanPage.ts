import type { Page } from "@playwright/test";

export class SellerKanbanPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/vendedor/pedidos");
  }

  card(orderId: string) {
    return this.page.getByTestId(`kanban-card-${orderId}`);
  }

  column(status: string) {
    return this.page.getByTestId(`kanban-column-${status}`);
  }

  // Camino de teclado de dnd-kit (decisión 9, KeyboardSensor de
  // @dnd-kit/core — no @dnd-kit/sortable, así que la tecla mueve el
  // draggable por PÍXELES, no por posiciones de lista): foco en la tarjeta
  // -> Space (levanta) -> ArrowRight repetido -> Space (suelta). El número
  // de repeticiones necesario para cruzar a la columna siguiente se
  // determina empíricamente contra la app real en la Fase 6.6 — no hay un
  // valor "correcto" a priori sin medirlo.
  async moveRightByKeyboard(orderId: string, arrowPresses: number) {
    const card = this.card(orderId);
    await card.focus();
    await this.page.keyboard.press("Space");
    for (let i = 0; i < arrowPresses; i++) {
      await this.page.keyboard.press("ArrowRight");
    }
    await this.page.keyboard.press("Space");
  }
}
