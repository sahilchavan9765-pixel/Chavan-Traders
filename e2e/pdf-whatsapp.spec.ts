import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import fs from "fs";

test.describe("PDF Engine & WhatsApp Share Link Verification", () => {
  test("PDF download triggers, produces valid PDF > 20 KB with %PDF header", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/invoice/P-0001");
    await page.waitForLoadState("domcontentloaded");

    const downloadBtn = page.locator("text=PDF डाऊनलोड करा").first();
    await expect(downloadBtn).toBeVisible();

    // Trigger download and catch download event
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await downloadBtn.click();
    const download = await downloadPromise;

    // Check downloaded filename matches Bill-Kharedi-... or Bill-Vikri-...
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/Bill-(Kharedi|Vikri)-.*\.pdf/);

    const path = await download.path();
    if (path) {
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(20000); // Must be > 20 KB

      // Check %PDF header
      const buffer = fs.readFileSync(path);
      const header = buffer.toString("utf-8", 0, 5);
      expect(header).toBe("%PDF-");
    }
  });

  test("Public share link /b/[token] is accessible without authentication", async ({ browser }) => {
    // Open a fresh incognito context with zero cookies
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/b/e2e-valid-token-32bytes-secure-hash");
    await page.waitForLoadState("domcontentloaded");

    // Must show Chavan Traders header and Bill
    await expect(page.locator("text=चव्हाण ट्रेडर्स").first()).toBeVisible();
    await expect(page.locator("text=PDF डाऊनलोड करा").first()).toBeVisible();

    // Expired token shows polite banner
    await page.goto("/b/e2e-expired-token-32bytes-hash");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=लिंकची मुदत संपली आहे").or(page.locator("text=Expired"))).toBeVisible();

    await context.close();
  });
});

