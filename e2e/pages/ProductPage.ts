import type { Page } from "@playwright/test";

export class ProductPage {
  constructor(private readonly page: Page) {}

  async goto(id: string) {
    await this.page.goto(`/producto/${id}`);
  }

  get addToCartButton() {
    return this.page.getByTestId("buybox-add-to-cart");
  }

  get disabledReason() {
    return this.page.getByTestId("buybox-disabled-reason");
  }

  async setQuantity(n: number) {
    await this.page.getByTestId("buybox-quantity-trigger").click();
    await this.page.getByRole("option", { name: String(n), exact: true }).click();
  }

  async addToCart(quantity = 1) {
    if (quantity > 1) await this.setQuantity(quantity);
    await this.addToCartButton.click();
  }
}
