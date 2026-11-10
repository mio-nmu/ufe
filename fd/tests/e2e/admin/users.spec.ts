import { expect, request, test } from "@playwright/test";

/**
 * Admin console against the real backend. Uses the seeded staff account
 * (bd/ `npm run db:seed`: manager / STAFF_PASSWORD — every staff login is
 * ADMIN). Listed users are provisioned through the public register API in
 * an ISOLATED request context — page.request would share the browser cookie
 * jar, and the register response's fresh session cookies would replace the
 * admin's.
 */

const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "9876";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010";

async function provisionUser(name: string): Promise<string> {
  const email = `e2e-${name.toLowerCase()}-${Date.now()}-${Math.trunc(Math.random() * 1e4)}@ufeedu.test`;
  const api = await request.newContext();
  const res = await api.post(`${API_URL}/api/v1/user/auth/register`, {
    data: { email, name: `E2E ${name}`, password: "Password123!" },
  });
  await api.dispose();
  if (res.status() !== 201) {
    throw new Error(`provisioning failed: ${res.status()} ${await res.text()}`);
  }
  return email;
}

async function loginAsManager(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Нэвтрэх нэр").fill("manager");
  await page.getByLabel("Нууц үг").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("admin console", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test("dashboard shows website visitors with a working range toggle", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Admin dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Website visitors")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /per week, 1 month/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "1 year" }).click();
    await expect(page.getByRole("button", { name: "1 year" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByRole("img", { name: /per month, 1 year/i }),
    ).toBeVisible();
  });

  test("dashboard shows the game timeline and recent activity", async ({
    page,
  }) => {
    await expect(page.getByText("Game timeline")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /games played per month/i }),
    ).toBeVisible();
    await expect(page.getByText("Recent activity")).toBeVisible();

    await page.getByRole("link", { name: "View all" }).click();
    await expect(page).toHaveURL(/\/admin\/activity$/);
    await expect(
      page.getByRole("heading", { name: "Өөрчлөлтийн түүх" }),
    ).toBeVisible();
  });

  test("users page lists a provisioned user via search", async ({ page }) => {
    const email = await provisionUser("list");

    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "Хэрэглэгчид" }),
    ).toBeVisible();

    await page.getByLabel("Хэрэглэгч хайх").fill(email);
    await page.getByRole("button", { name: "Хайх" }).click();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();
    await expect(page.getByText(/1 хэрэглэгч/)).toBeVisible();
  });

  test("admin can deactivate and reactivate a user", async ({ page }) => {
    const email = await provisionUser("toggle");

    await page.goto("/admin/users");
    await page.getByLabel("Хэрэглэгч хайх").fill(email);
    await page.getByRole("button", { name: "Хайх" }).click();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    const row = page.getByRole("row", { name: new RegExp(email) });
    await row.getByRole("button", { name: "Идэвхгүй болгох" }).click();
    await expect(row.getByText("Идэвхгүй", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Идэвхжүүлэх" }).click();
    await expect(row.getByText("Идэвхтэй", { exact: true })).toBeVisible();
  });
});
