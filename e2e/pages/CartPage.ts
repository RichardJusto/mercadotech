import type { Page } from "@playwright/test";

export class CartPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/carrito");
  }

  get items() {
    return this.page.getByTestId("cart-item-row");
  }

  get subtotalRow() {
    return this.page.getByTestId("cart-subtotal-row");
  }

  get checkoutButton() {
    return this.page.getByTestId("cart-checkout");
  }

  // Devuelve el id del pedido recién creado leyéndolo de la URL de
  // redirección — nunca "el primero de la lista" (regla explícita de 6.5).
  async checkout(): Promise<string> {
    await this.checkoutButton.click();
    await this.page.waitForURL(/\/pedidos\/.+/);
    const match = this.page.url().match(/\/pedidos\/([^/?]+)/);
    if (!match) throw new Error(`No se pudo extraer el id del pedido de ${this.page.url()}`);
    return match[1];
  }
}
