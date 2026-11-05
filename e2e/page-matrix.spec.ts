import { test, expect } from "@playwright/test";
import { loginAsAdmin, assertNoServerErrors, assertNoHorizontalOverflow } from "./helpers";

test.describe("E2E Page Matrix Verification", () => {
  test("Public pages render with HTTP 200, zero server errors, no horizontal overflow", async ({ page }) => {
    const publicRoutes = [
      "/",
      "/login",
      "/b/e2e-valid-token-32bytes-secure-hash",
      "/b/e2e-expired-token-32bytes-hash",
    ];

    for (const route of publicRoutes) {
      const resp = await page.goto(route);
      expect(resp?.status()).toBe(200);
      await page.waitForLoadState("domcontentloaded");
      await assertNoServerErrors(page);
      await assertNoHorizontalOverflow(page);
    }
  });

  test("404 page renders gracefully for invalid route", async ({ page }) => {
    const resp = await page.goto("/some-completely-invalid-route-404");
    expect(resp?.status()).toBe(404);
    await assertNoServerErrors(page);
    await expect(page.locator("text=पृष्ठ सापडले नाही").first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("Authenticated portal routes load with zero server errors", async ({ page }) => {
    await loginAsAdmin(page);

    const authRoutes = [
      "/app",
      "/app/purchase",
      "/app/sales",
      "/app/payments",
      "/app/stock",
      "/app/calls",
      "/app/enquiries",
      "/app/settings",
      "/app/users",
    ];

    for (const route of authRoutes) {
      const resp = await page.goto(route);
      expect(resp?.status()).toBe(200);
      await page.waitForLoadState("domcontentloaded");
      await assertNoServerErrors(page);
      await assertNoHorizontalOverflow(page);
    }
  });

  test("Invoice page renders correctly without browser chrome errors", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/invoice/P-0001");
    await page.waitForLoadState("domcontentloaded");
    await assertNoServerErrors(page);

    // Verify exactly 2 actions are shown on invoice page
    const downloadBtn = page.locator("text=PDF डाऊनलोड करा");
    const whatsappBtn = page.locator("text=WhatsApp वर पाठवा").or(page.locator("text=WhatsApp"));
    await expect(downloadBtn).toBeVisible();
    await expect(whatsappBtn).toBeVisible();

    // Verify Print button is completely removed
    const printBtn = page.locator("text=प्रिंट करा");
    await expect(printBtn).toHaveCount(0);
  });
});

