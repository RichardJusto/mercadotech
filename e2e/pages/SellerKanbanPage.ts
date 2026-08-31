import type { Page } from "@playwright/test";

// KeyboardSensor de @dnd-kit/core (no @dnd-kit/sortable) mueve el
// draggable por un paso FIJO de 25px por tecla — constante del propio
// paquete (node_modules/@dnd-kit/core/dist/core.esm.js,
// defaultKeyboardCoordinateGetter), no algo medido del DOM.
const KEYBOARD_STEP_PX = 25;

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

  // Camino de teclado de dnd-kit (decisión 9): foco en la tarjeta -> Space
  // (levanta) -> ArrowRight repetido -> Space (suelta). En vez de adivinar
  // cuántas veces hace falta apretar la flecha (un número fijo resultó
  // frágil entre Windows local y el runner Linux de CI — mismo paso de
  // 25px, pero geometría/tiempos distintos igual lo hicieron fallar), se
  // mide la posición real de la tarjeta y de la columna destino con
  // boundingBox() y se deriva la cantidad exacta de repeticiones — robusto
  // sin importar el entorno.
  async moveToColumn(orderId: string, targetStatus: string) {
    const card = this.card(orderId);
    const targetColumn = this.column(targetStatus);

    const cardBox = await card.boundingBox();
    const columnBox = await targetColumn.boundingBox();
    if (!cardBox || !columnBox) {
      throw new Error("No se pudo medir la posición de la tarjeta o la columna destino.");
    }

    const cardCenterX = cardBox.x + cardBox.width / 2;
    const columnCenterX = columnBox.x + columnBox.width / 2;
    const deltaX = columnCenterX - cardCenterX;
    const presses = Math.round(Math.abs(deltaX) / KEYBOARD_STEP_PX);
    const key = deltaX > 0 ? "ArrowRight" : "ArrowLeft";

    await card.focus();
    await this.page.keyboard.press("Space");
    for (let i = 0; i < presses; i++) {
      await this.page.keyboard.press(key);
      // Un pequeño respiro entre teclas: en un runner de CI más lento, React
      // puede no terminar de procesar el estado del arrastre antes de que
      // llegue la siguiente tecla si se disparan todas sin pausa.
      await this.page.waitForTimeout(30);
    }
    await this.page.keyboard.press("Space");
  }
}
