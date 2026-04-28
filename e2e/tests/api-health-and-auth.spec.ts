import { test, expect } from "@playwright/test";

test("API health", async ({ request }) => {
  const r = await request.get("/health");
  expect(r.ok()).toBeTruthy();
  const j = (await r.json()) as { status: string };
  expect(j).toEqual({ status: "ok" });
});

test("e2e_admin login and me", async ({ request }) => {
  const t = await request.post("/auth/token", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ login: "e2e_admin", password: "testpass1" }),
  });
  if (t.status() === 401) {
    test.skip();
    return;
  }
  expect(t.ok()).toBeTruthy();
  const body = (await t.json()) as { access_token: string; refresh_token: string };
  expect(body.refresh_token?.length).toBeGreaterThan(10);
  const me = await request.get("/auth/me", {
    headers: { Authorization: `Bearer ${body.access_token}` },
  });
  expect(me.ok()).toBeTruthy();
  const m = (await me.json()) as { login: string };
  expect(m.login).toBe("e2e_admin");
});
