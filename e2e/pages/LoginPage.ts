import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(redirectTo?: string) {
    const url = redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login";
    await this.page.goto(url);
  }

  async login(user: { email: string; password: string }) {
    await this.page.getByTestId("login-email").fill(user.email);
    await this.page.getByTestId("login-password").fill(user.password);
    await this.page.getByTestId("login-submit").click();
  }
}
