import { expect, request, test } from "@playwright/test";

/**
 * Full user journey against the real backend:
 * register → dashboard → logout → login → dashboard → guarded redirect.
 *
 * Every test provisions its own user through the public register API (in an
 * ISOLATED request context — page.request would share the browser cookie jar
 * and the register response's session cookies would leak into the page).
 * Login/register pages are Mongolian; the user dashboard is English.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010";
const PASSWORD = "Password123!";

async function provisionUser(name: string): Promise<string> {
  const email = `e2e-${name.toLowerCase()}-${Date.now()}-${Math.trunc(Math.random() * 1e4)}@ufeedu.test`;
  const api = await request.newContext();
  const res = await api.post(`${API_URL}/api/v1/user/auth/register`, {
    data: { email, name, password: PASSWORD },
  });
  await api.dispose();
  if (res.status() !== 201) {
    throw new Error(`provisioning failed: ${res.status()} ${await res.text()}`);
  }
  return email;
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Нэвтрэх нэр").fill(email);
  await page.getByLabel("Нууц үг").fill(PASSWORD);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();
}

test.describe("user auth flow", () => {
  // Sign-up page closed (next.config.ts redirects /register → /login).
  test.skip("register lands on the dashboard", async ({ page }) => {
    const email = `e2e-ui-${Date.now()}-${Math.trunc(Math.random() * 1e4)}@ufeedu.test`;
    await page.goto("/register");

    await page.getByLabel("Нэр").fill("E2E User");
    await page.getByLabel("Имэйл").fill(email);
    await page.getByLabel("Нууц үг", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Нууц үг давтах").fill(PASSWORD);
    await page.getByRole("button", { name: "Бүртгэл үүсгэх" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  // Sign-up page closed (next.config.ts redirects /register → /login).
  test.skip("form validation blocks a bad submission client-side", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Имэйл").fill("not-an-email");
    await page.getByLabel("Нууц үг", { exact: true }).fill("short");
    await page.getByLabel("Нууц үг давтах").fill("different");
    await page.getByRole("button", { name: "Бүртгэл үүсгэх" }).click();

    await expect(page.getByText("Зөв имэйл хаяг оруулна уу")).toBeVisible();
    await expect(
      page.getByText("Нууц үг дор хаяж 8 тэмдэгт байх ёстой"),
    ).toBeVisible();
    await expect(page.getByText("Нууц үгүүд таарахгүй байна")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("logout clears the session and guards kick in", async ({ page }) => {
    const email = await provisionUser("logout");

    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    // Log out via the account menu. Clearing the session kicks RequireAuth
    // in before any navigation, so the user lands on /login.
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Anonymous visit to a protected page bounces to /login.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("can log back in with the same credentials", async ({ page }) => {
    const email = await provisionUser("relogin");

    await login(page, email);

    await expect(page).toHaveURL(/\/dashboard$/);
    // The dashboard shows the email in more than one spot — pin the first.
    await expect(page.getByText(email).first()).toBeVisible();
  });

  test("a plain user cannot open the admin area", async ({ page }) => {
    const email = await provisionUser("plain");

    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
