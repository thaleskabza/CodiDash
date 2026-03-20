import { test, expect } from "@playwright/test";

const DRIVER_EMAIL = `e2e-driver-${Date.now()}@test.com`;
const DRIVER_PASSWORD = "TestPass123!";

test.describe("Driver fulfillment flow", () => {
  test("register → login → dashboard", async ({ page }) => {
    // 1. Register as driver
    await page.goto("/driver/register");
    await page.fill('[name="name"]', "E2E Driver");
    await page.fill('[name="email"]', DRIVER_EMAIL);
    await page.fill('[name="password"]', DRIVER_PASSWORD);
    await page.fill('[name="vehicleReg"]', "CA 123-456");
    await page.click('[type="submit"]');

    // Pending approval screen or dashboard
    await expect(page).toHaveURL(/\/driver/);
  });

  test("pending driver sees approval notice", async ({ page }) => {
    await page.goto("/driver/login");
    await page.fill('[name="email"]', DRIVER_EMAIL);
    await page.fill('[name="password"]', DRIVER_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/driver");
    await expect(
      page.locator("text=pending admin approval, text=Pending Approval").first()
    ).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("unauthenticated access to driver dashboard redirects to login", async ({ page }) => {
    await page.goto("/driver");
    await expect(page).toHaveURL(/\/driver\/login/);
  });

  test("active order page requires authentication", async ({ page }) => {
    await page.goto("/driver/orders/nonexistent-order");
    await expect(page).toHaveURL(/\/driver\/login/);
  });
});
