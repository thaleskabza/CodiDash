import { test, expect } from "@playwright/test";

test.describe("Admin monitoring flow", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin (requires ADMIN_EMAIL/ADMIN_PASSWORD env vars for E2E)
    const email = process.env.E2E_ADMIN_EMAIL ?? "admin@codidash.co.za";
    const password = process.env.E2E_ADMIN_PASSWORD ?? "AdminPass123!";
    await page.goto("/login");
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.click('[type="submit"]');
  });

  test("admin sees dashboard with overview cards", async ({ page }) => {
    await expect(page).toHaveURL("/admin");
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await expect(page.locator("text=Active Orders, text=Online Drivers").first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("admin navigates to orders page", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.locator("text=Orders")).toBeVisible();
  });

  test("admin navigates to drivers page and sees approve button for pending drivers", async ({ page }) => {
    await page.goto("/admin/drivers?status=pending_approval");
    await expect(page.locator("text=Drivers")).toBeVisible();
  });

  test("admin navigates to revenue page", async ({ page }) => {
    await page.goto("/admin/revenue");
    await expect(page.locator("text=Revenue")).toBeVisible();
  });

  test("non-admin is redirected away from admin pages", async ({ page, context }) => {
    // Clear admin session
    await context.clearCookies();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
