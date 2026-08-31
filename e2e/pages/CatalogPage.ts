import type { Page } from "@playwright/test";

export class CatalogPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async gotoCategory(slug: string) {
    await this.page.goto(`/categoria/${slug}`);
  }

  productLink(title: string) {
    return this.page.getByRole("link", { name: new RegExp(title) });
  }

  async openProduct(title: string) {
    await this.productLink(title).first().click();
  }
}
