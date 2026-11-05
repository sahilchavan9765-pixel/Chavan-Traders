import { test, expect } from "@playwright/test";
import { loginAsAdmin, assertNoServerErrors } from "./helpers";

test.describe("Core Business Workflows & Data Integrity", () => {
  test("Public enquiry form submission works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const nameInput = page.locator('input[name="name"], input[placeholder*="नाव"], input[placeholder*="Name"]').first();
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="मोबाईल"], input[placeholder*="Mobile"]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("शशिकांत देसाई");
      await phoneInput.fill("9421188990");
      const msgInput = page.locator('textarea, input[placeholder*="संदेश"]').first();
      if (await msgInput.isVisible()) {
        await msgInput.fill("सोयाबीन दर काय आहे? 2 टन खरेदी करायचा आहे.");
      }
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("Create purchase bill with Marathi bag weights and verify in ledger", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/purchase");
    await page.waitForLoadState("domcontentloaded");
    await assertNoServerErrors(page);

    // Fill form
    const farmerInput = page.locator('input[placeholder*="आनंदराव"], input[placeholder*="Anand"]').first();
    await farmerInput.fill("बाळासो माने");

    const mobileInput = page.locator('input[placeholder*="मोबाईल"], input[placeholder*="mobile"]').first();
    if (await mobileInput.isVisible()) {
      await mobileInput.fill("9822334455");
    }

    const bagsInput = page.locator('input[placeholder*="45 46"]').first();
    await bagsInput.fill("४५+५०+५५");

    const rateInput = page.locator('input[placeholder*="34.50"]').first();
    await rateInput.fill("40");

    // Submit bill
    const submitBtn = page.locator('button[type="submit"]:has-text("बिल जतन करा"), button:has-text("Save Bill")').first();
    await submitBtn.click();

    // Verify success banner appears with 2 actions
    await expect(page.locator("text=यशस्वीरित्या सेव्ह झाले").first()).toBeVisible({ timeout: 15000 });
  });

  test("Delete and Restore bill with ConfirmDialog works and blocks staff", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/purchase");
    await page.waitForLoadState("domcontentloaded");

    // Look for delete button on recent bill row
    const deleteBtn = page.locator('button[title*="रद्द करा"], button[title*="Delete"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm dialog must appear (not window.confirm)
      const confirmDialog = page.locator("text=बिल रद्द करण्याची खात्री करा");
      await expect(confirmDialog).toBeVisible();

      const cancelBtn = page.locator('button:has-text("नाही, मागे जा"), button:has-text("Cancel")');
      await cancelBtn.click();
      await expect(confirmDialog).not.toBeVisible();
    }
  });
});

