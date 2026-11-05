import { Page, expect } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', "e2e_admin@chavantraders.test");
  await page.fill('input[type="password"]', "E2E_Secure@Test2026!");
  await page.click('button[type="submit"]');

  // Should navigate to /app
  await page.waitForURL("**/app", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

export async function assertNoServerErrors(page: Page) {
  const content = await page.content();
  expect(content).not.toContain("This page couldn't load");
  expect(content).not.toContain("A server error occurred");
  expect(content).not.toContain("ERROR 3179250132");
  expect(content).not.toContain("ERROR 2450339902");
  expect(content).not.toContain("Internal Server Error");
}

export async function assertNoHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 1-2px tolerance for browser rounding
}

