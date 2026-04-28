import { test, expect, chromium, type APIRequestContext } from "@playwright/test";

const app = process.env.PLAYWRIGHT_APP_URL || "http://127.0.0.1:3000";
const login = process.env.PLAYWRIGHT_E2E_LOGIN || "e2e_admin";
const password = process.env.PLAYWRIGHT_E2E_PASSWORD || "testpass1";

async function isUp(request: APIRequestContext, base: string): Promise<boolean> {
  try {
    const r = await request.get(base + "/", { timeout: 3_000 });
    return r.ok() || (r.status() > 0 && r.status() < 500);
  } catch {
    return false;
  }
}

test("app login then applications heading (when docker is up)", async () => {
  const browser = await chromium.launch();
  const br = await browser.newContext();
  const request = br.request;
  if (!(await isUp(request, app))) {
    await browser.close();
    test.skip();
    return;
  }
  const page = await br.newPage();
  await page.goto(`${app}/login`);
  await page.locator("#login").fill(login);
  await page.locator("#pass").fill(password);
  await page.getByRole("button", { name: /Войти|Вход/ }).click();
  await expect(page).toHaveURL(/\/applications\/?$/);
  await expect(page.getByRole("heading", { name: "Заявки" })).toBeVisible();
  await browser.close();
});
