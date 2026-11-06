import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const state = await (await request.get("/api/admin/dreams")).json();
  await request.post("/api/admin/reset", { data: { round: state.round, confirm: "RESET" } });
});

test("live arrival, moderation and confirmed reset synchronize two displays", async ({ page, context, request }) => {
  await page.goto("/");
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/empty-desktop.png", fullPage: true, animations: "disabled" });
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  const message = "อยากสร้างเกมที่ทำให้ทุกคนยิ้มได้";
  expect((await request.post("/api/dreams", { data: { dream: message } })).status()).toBe(201);
  await expect(page.locator(".arrival")).toContainText(message);
  await page.screenshot({ path: ".impeccable/review/arrival-desktop.png", fullPage: true, animations: "disabled" });
  await expect(other.locator(".arrival")).toContainText(message);

  const admin = await context.newPage();
  await admin.goto("/admin");
  await admin.getByRole("button", { name: `ซ่อนความฝัน: ${message}`, exact: true }).click();
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(other.locator(".arrival")).toHaveCount(0);
  await admin.getByRole("button", { name: `แสดงความฝัน: ${message}`, exact: true }).click();
  await expect(page.locator(".dream-card")).toContainText(message);

  await request.post("/api/dreams", { data: { dream: "ข้อความในคิวรอบเก่า" } });
  await admin.getByRole("button", { name: "รีเซ็ตและเริ่มรอบใหม่" }).click();
  await expect(admin.getByRole("dialog")).toBeVisible();
  const confirm = admin.getByRole("button", { name: "ลบทั้งหมดและเริ่มรอบใหม่", exact: true });
  await expect(confirm).toBeDisabled();
  await admin.getByLabel("พิมพ์ RESET เพื่อยืนยันการลบ").fill("RESET");
  await confirm.click();
  await expect(admin.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(other.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(page.locator(".arrival")).toHaveCount(0);
  await request.post("/api/dreams", { data: { dream: "เริ่มความฝันใหม่อีกครั้ง" } });
  await expect(page.locator(".arrival")).toContainText("เริ่มความฝันใหม่อีกครั้ง");
});

test("desktop projector and mobile stay readable, HTML remains text, and reset traps keyboard focus", async ({ page, request }) => {
  await request.post("/api/dreams", { data: { dream: '<img src=x onerror="alert(1)">' } });
  for (let i = 0; i < 5; i++) await request.post("/api/dreams", { data: { dream: "ความฝันของฉันคือการสร้างอนาคตที่ดีให้กับทุกคน ".repeat(6) } });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".dream-card")).toHaveCount(6);
  await expect(page.locator(".dream-card img")).toHaveCount(0);
  await page.screenshot({ path: ".impeccable/review/desktop.png", fullPage: true, animations: "disabled" });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 1440);
  const footer = await page.locator(".wall-footer").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(900);

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: ".impeccable/review/projector.png", fullPage: true, animations: "disabled" });
  const projectorFooter = await page.locator(".wall-footer").boundingBox();
  expect(projectorFooter!.y + projectorFooter!.height).toBeLessThanOrEqual(768);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".impeccable/review/mobile.png", fullPage: true, animations: "disabled" });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.goto("/admin");
  await expect(page.locator(".dream-list li")).toHaveCount(6);
  await page.screenshot({ path: ".impeccable/review/admin-mobile.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: ".impeccable/review/admin-desktop.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "รีเซ็ตและเริ่มรอบใหม่" }).click();
  await expect(page.getByLabel("พิมพ์ RESET เพื่อยืนยันการลบ")).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".impeccable/review/reset-dialog.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "รีเซ็ตและเริ่มรอบใหม่" })).toBeFocused();
});

test("maximum-length arrivals fit the projector, pause stops timers, and reset still clears paused content", async ({ page, request }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await request.post("/api/dreams", { data: { dream: "W".repeat(500) } });
  await expect(page.locator(".arrival p")).toHaveText("W".repeat(64));
  await expect(page.locator(".arrival-tail")).toContainText("ส่วนที่ 1/8");
  const footer = await page.locator(".wall-footer").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(768);
  await page.screenshot({ path: ".impeccable/review/arrival-max-projector.png", fullPage: true, animations: "disabled" });

  await page.clock.install();
  await page.getByRole("button", { name: "พักข้อความ", exact: true }).click();
  await expect(page.getByRole("button", { name: "เล่นต่อ", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward(20000);
  await expect(page.locator(".arrival-tail")).toContainText("ส่วนที่ 1/8");
  await page.screenshot({ path: ".impeccable/review/paused-projector.png", fullPage: true, animations: "disabled" });

  const state = await (await request.get("/api/admin/dreams")).json();
  await request.post("/api/admin/reset", { data: { round: state.round, confirm: "RESET" } });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(page.locator(".arrival")).toHaveCount(0);
  await page.getByRole("button", { name: "เล่นต่อ", exact: true }).click();
  await expect(page.getByRole("button", { name: "พักข้อความ", exact: true })).toBeVisible();
});

test("public outage copy stays participant-facing and recovers without a reload", async ({ page }) => {
  await page.route("**/api/dreams", route => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "ตั้งค่า DATABASE_URL แล้วรัน npm run db:setup" }),
  }));
  await page.goto("/");
  await expect(page.getByText("ยังเชื่อมต่อกำแพงไม่ได้")).toBeVisible();
  await expect(page.locator(".connection-banner")).toContainText("กำลังเชื่อมต่อกำแพงความฝันอีกครั้ง");
  await expect(page.locator("body")).not.toContainText("DATABASE_URL");
  await expect(page.locator("body")).not.toContainText("npm run");
  await page.screenshot({ path: ".impeccable/review/outage-desktop.png", fullPage: true, animations: "disabled" });
  await page.unroute("**/api/dreams");
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(page.locator(".connection-banner")).toHaveCount(0);
});
