import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const CUSTOMER_EMAIL = "customer@codidash.co.za";
const CUSTOMER_PASSWORD = "Customer@CodiDash2024!";
const TEST_ADDRESS = "10 Long Street, Cape Town, South Africa";

test.describe("Customer smoke test", () => {
  test("login → view profile → add address → logout", async ({ page }) => {
    // ── 1. Login ──────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/email address/i).fill(CUSTOMER_EMAIL);
    await page.getByLabel(/password/i).fill(CUSTOMER_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to home (customer dashboard)
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.getByText(/place your order/i)).toBeVisible();

    // ── 2. Navigate to Profile ────────────────────────────────────────────
    await page.getByRole("link", { name: /profile/i }).click();
    await expect(page).toHaveURL(`${BASE_URL}/profile`);
    await expect(page.getByRole("heading", { name: /my profile/i })).toBeVisible();
    await expect(page.getByText(CUSTOMER_EMAIL)).toBeVisible();

    // ── 3. Add a delivery address ─────────────────────────────────────────
    await page.getByRole("button", { name: /\+ add address/i }).click();
    await expect(page.getByText(/new address/i)).toBeVisible();

    // Fill in label
    await page.getByLabel(/label/i).fill("Home");

    // Type address and wait for geocoding suggestion
    await page.getByLabel(/delivery address/i).fill(TEST_ADDRESS);
    await expect(page.getByText(/use this address/i)).toBeVisible({ timeout: 10000 });

    // Click the geocoded suggestion to confirm
    await page.getByText(/use this address/i).click();

    // Check "Set as default"
    await page.getByLabel(/set as default/i).check();

    // Save
    await page.getByRole("button", { name: /save address/i }).click();

    // Address should now appear in the list
    await expect(page.getByText("Home")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/default/i)).toBeVisible();

    // ── 4. Logout ─────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
