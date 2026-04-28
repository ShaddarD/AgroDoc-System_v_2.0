import { test, expect, chromium, type APIRequestContext } from "@playwright/test";

const app = process.env.PLAYWRIGHT_APP_URL || "http://127.0.0.1:3000";
const admin = process.env.PLAYWRIGHT_ADMIN_URL || "http://127.0.0.1:3001";

async function isUp(request: APIRequestContext, base: string): Promise<boolean> {
  try {
    const r = await request.get(base + "/", { timeout: 3_000 });
    return r.ok() || (r.status() > 0 && r.status() < 500);
  } catch {
    return false;
  }
}

test("app landing title (when docker is up)", async () => {
  const browser = await chromium.launch();
  const br = await browser.newContext();
  const request = br.request;
  if (!(await isUp(request, app))) {
    await browser.close();
    test.skip();
    return;
  }
  const page = await br.newPage();
  await page.goto(app + "/");
  await expect(page).toHaveTitle(/AgroDoc/);
  await browser.close();
});

test("admin landing title (when docker is up)", async () => {
  const browser = await chromium.launch();
  const br = await browser.newContext();
  const request = br.request;
  if (!(await isUp(request, admin))) {
    await browser.close();
    test.skip();
    return;
  }
  const page = await br.newPage();
  await page.goto(admin + "/");
  await expect(page).toHaveTitle(/AgroDoc/);
  await browser.close();
});
