import { expect, test } from "@playwright/test";

test("pagination stays fixed across full, tall and partial pages at every breakpoint", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/dreams", route => route.fulfill({ json: {
    round: 1, generation: 1, revision: 1, paused: false, pollingEnabled: false,
    dreams: Array.from({ length: 13 }, (_, index) => ({
      id: `pagination-${index}`, dream: index >= 6 && index < 12 ? "W".repeat(64) : `ความฝัน ${index + 1}`,
      createdAt: "2026-11-07T00:00:00Z", hidden: false,
    })),
  } }));
  await page.goto("/");
  await expect(page.locator(".dream-card:visible")).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);

  for (const width of [1440, 1366, 700, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".wall-pagination").scrollIntoViewIfNeeded();
    const baseline = await page.locator(".wall-pagination").boundingBox();
    for (const number of [2, 3, 1]) {
      await page.getByRole("button", { name: `แสดงความฝันหน้าที่ ${number}`, exact: true }).click();
      await expect(page.locator(".dream-card:visible")).toHaveCount(number === 3 ? 1 : 6);
      const position = await page.locator(".wall-pagination").boundingBox();
      expect(Math.abs(position!.y - baseline!.y)).toBeLessThan(1);
      expect(Math.abs(position!.x - baseline!.x)).toBeLessThan(1);
      expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    }
    await expect(page.locator('.dream-grid[aria-hidden="true"][inert]')).toHaveCount(2);
  }
});
