import { test as base, expect, type Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { buyer1, buyer2, seller1 } from "../data/users";

// Cada test de Playwright ya arranca con un browser context nuevo (sesión
// propia, sin cookies compartidas entre specs) — este fixture solo agrega
// atajos de login por Page Object encima de esa base.
interface AuthFixtures {
  loginAsBuyer1: () => Promise<void>;
  loginAsBuyer2: () => Promise<void>;
  loginAsSeller1: () => Promise<void>;
}

async function loginAs(page: Page, user: { email: string; password: string }) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(user);
  await page.waitForURL("/");
}

export const test = base.extend<AuthFixtures>({
  loginAsBuyer1: async ({ page }, use) => {
    await use(() => loginAs(page, buyer1));
  },
  loginAsBuyer2: async ({ page }, use) => {
    await use(() => loginAs(page, buyer2));
  },
  loginAsSeller1: async ({ page }, use) => {
    await use(() => loginAs(page, seller1));
  },
});

export { expect };
