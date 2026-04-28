import { test, expect, chromium, type APIRequestContext } from "@playwright/test";

const admin = process.env.PLAYWRIGHT_ADMIN_URL || "http://127.0.0.1:3001";
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

test("admin login then users page (when docker is up)", async () => {
  const browser = await chromium.launch();
  const br = await browser.newContext();
  const request = br.request;
  if (!(await isUp(request, admin))) {
    await browser.close();
    test.skip();
    return;
  }
  const page = await br.newPage();
  await page.goto(`${admin}/login`);
  await page.locator("#alogin").fill(login);
  await page.locator("#apass").fill(password);
  await page.getByRole("button", { name: /Войти|Вход/ }).click();
  await expect(page.getByRole("heading", { name: "Панель администратора" })).toBeVisible({ timeout: 15_000 });
  await page.goto(`${admin}/users`);
  await expect(page.getByRole("heading", { name: "Учётные записи" })).toBeVisible();
  await browser.close();
});
