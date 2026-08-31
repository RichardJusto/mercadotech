import type { Page } from "@playwright/test";

export class OrdersPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/pedidos");
  }

  async gotoOrder(orderId: string) {
    await this.page.goto(`/pedidos/${orderId}`);
  }

  orderCard(orderId: string) {
    return this.page.getByTestId(`order-card-${orderId}`);
  }

  get statusBadge() {
    return this.page.getByTestId("order-status-badge");
  }
}
