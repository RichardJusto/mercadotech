import type { Page } from "@playwright/test";

export interface PublishProductInput {
  title: string;
  description?: string;
  brand?: string;
  price: number;
  stock: number;
  condition?: "Nuevo" | "Usado" | "Reacondicionado";
  categoryName: string;
  imagePath: string;
}

export class SellerProductsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/vendedor/productos");
  }

  async gotoPublish() {
    await this.page.goto("/vendedor/publicar");
  }

  async fillAndSubmit(input: PublishProductInput) {
    await this.page.getByTestId("product-title").fill(input.title);
    if (input.description) {
      await this.page.getByTestId("product-description").fill(input.description);
    }
    if (input.brand) {
      await this.page.getByTestId("product-brand").fill(input.brand);
    }
    await this.page.getByTestId("product-price").fill(String(input.price));
    await this.page.getByTestId("product-stock").fill(String(input.stock));

    if (input.condition) {
      await this.page.getByTestId("product-condition-trigger").click();
      await this.page.getByRole("option", { name: input.condition, exact: true }).click();
    }

    await this.page.getByTestId("product-category-trigger").click();
    await this.page.getByRole("option", { name: input.categoryName, exact: true }).click();

    await this.page.getByTestId("product-image-input").setInputFiles(input.imagePath);

    await this.page.getByTestId("product-submit").click();
  }

  row(title: string) {
    return this.page.getByRole("row", { name: new RegExp(title) });
  }
}
