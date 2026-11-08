import { expect, test } from "@playwright/test";
import type { Dream, WallSnapshot } from "../../lib/contracts";

const dream = (text: string, index: number): Dream => ({
  id: `long-${index}`, dream: text, createdAt: "2026-11-08T00:00:00Z", hidden: false,
});
const snapshot = (dreams: Dream[]): WallSnapshot => ({
  round: 1, generation: 1, revision: 1, paused: false,
  pollingEnabled: false, feedbackVisible: true, dreams,
});

test("long messages stay in one bounded card without scrolling the wall", async ({ page }) => {
  const messages = [
    "W".repeat(500),
    "ความฝันของฉันคือการสร้างอนาคตที่ดีให้ทุกคน 🚀 ".repeat(10).trim(),
    "hello\n\nworld\n" + "a\n".repeat(100) + "end",
    "🚀".repeat(500),
    '<img src=x onerror="alert(1)">' + " text".repeat(80),
    "ความฝันสั้น ๆ",
    "ความฝันหน้าถัดไป",
  ];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/dreams", route => route.fulfill({ json: snapshot(messages.map(dream)) }));
  await page.goto("/");
  await expect(page.locator(".dream-card")).toHaveCount(7);
  await expect(page.locator(".dream-card:visible")).toHaveCount(6);
  await expect(page.locator(".dream-card p img")).toHaveCount(0);
  await expect(page.locator(".wall-pagination button")).toHaveCount(2);

  for (const [width, height] of [[1440, 900], [1366, 768], [700, 900], [390, 844], [844, 390], [320, 568]]) {
    await page.setViewportSize({ width, height });
    const pageSize = width <= 380 ? 1 : width <= 700 || height <= 600 ? 2 : 6;
    await expect(page.locator(".dream-card:visible")).toHaveCount(pageSize);
    for (const [index, message] of messages.slice(0, pageSize).entries()) {
      const paragraph = page.locator(".dream-grid.is-current .dream-card p").nth(index);
      await expect(paragraph).toHaveJSProperty("textContent", message);
      await expect(paragraph).toHaveCSS("white-space", "pre-wrap");
      await expect(paragraph).toHaveCSS("overflow", "hidden");
      await expect(paragraph.locator("span")).toHaveCSS("overflow", "hidden");
      const box = await paragraph.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(16);
      const textBox = await paragraph.locator("span").boundingBox();
      expect(textBox!.height).toBeLessThanOrEqual(box!.height + 1);
      expect(await paragraph.evaluate(element => Number.parseInt(getComputedStyle(element.firstElementChild!).webkitLineClamp))).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    const footer = await page.locator(".wall-footer").boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(height);
  }
  await page.getByRole("button", { name: "แสดงความฝันหน้าที่ 7", exact: true }).click();
  await expect(page.locator(".dream-card:visible")).toHaveCount(1);
  await expect(page.locator(".dream-card:visible p")).toHaveText(messages[6]);
  await expect(page.locator(".dream-card:visible .dream-signature > span")).toHaveText("07");
});

test("empty and offline walls keep the footer inside the fixed viewport", async ({ page }) => {
  let online = true;
  await page.route("**/api/dreams", route => online
    ? route.fulfill({ json: snapshot([]) })
    : route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  for (const available of [true, false]) {
    online = available;
    await page.goto("/");
    await expect(page.getByText(available ? "จักรวาลนี้กำลังรอความฝันแรก" : "ยังเชื่อมต่อกำแพงไม่ได้")).toBeVisible();
    for (const [width, height] of [[1366, 768], [390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
      const footer = await page.locator(".wall-footer").boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(height);
    }
  }
});

test("a long arrival remains whole while paused and joins the wall after one advance", async ({ page }) => {
  let state = snapshot([]);
  const message = "ความฝัน🚀\n\n" + "W".repeat(480);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.route("**/api/dreams", route => route.fulfill({ json: state }));
  await page.goto("/");
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  state = { ...state, revision: 2, dreams: [dream(message, 0)] };
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator(".arrival p")).toHaveJSProperty("textContent", message);
  await expect(page.locator(".arrival-tail")).not.toContainText("ส่วนที่");
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 768 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(768);
    await page.screenshot({ path: `.impeccable/review/long-arrival-${width}.png`, fullPage: true, animations: "disabled" });
  }
  state = { ...state, revision: 3, paused: true };
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator("main")).toHaveClass(/is-paused/);
  await page.clock.fastForward(20000);
  await expect(page.locator(".arrival p")).toHaveJSProperty("textContent", message);
  state = { ...state, revision: 4, paused: false };
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator("main")).not.toHaveClass(/is-paused/);
  await page.clock.fastForward(6500);
  await expect(page.locator(".arrival")).toHaveCount(0);
  await expect(page.locator(".dream-card")).toHaveCount(1);
  await expect(page.locator(".dream-card p")).toHaveJSProperty("textContent", message);
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 768 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(768);
    await page.screenshot({ path: `.impeccable/review/long-card-${width}.png`, fullPage: true, animations: "disabled" });
  }
});
