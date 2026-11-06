import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request, context }) => {
  expect((await request.post("/api/admin/session", { data: { password: "cpediwa" } })).ok()).toBe(true);
  expect((await context.request.post("/api/admin/session", { data: { password: "cpediwa" } })).ok()).toBe(true);
  const state = await (await request.get("/api/admin/dreams")).json();
  expect((await request.patch("/api/admin/polling", { data: { round: state.round, generation: state.generation, enabled: true } })).ok()).toBe(true);
  await request.post("/api/admin/reset", { data: { round: state.round, generation: state.generation, confirm: "RESET" } });
});

test("admin can stop every display's polling until the event starts", async ({ page, context, request }) => {
  const projector = await context.newPage();
  let adminRequests = 0;
  let projectorRequests = 0;
  page.on("request", req => { if (new URL(req.url()).pathname === "/api/admin/dreams") adminRequests++; });
  projector.on("request", req => { if (new URL(req.url()).pathname === "/api/dreams" && req.method() === "GET") projectorRequests++; });
  await page.goto("/admin");
  await projector.goto("/");
  await expect(page.getByRole("button", { name: "หยุดอัปเดตอัตโนมัติ", exact: true })).toBeEnabled();
  await expect(projector.locator(".live-status")).toHaveCount(0);
  await page.getByRole("button", { name: "หยุดอัปเดตอัตโนมัติ", exact: true }).click();
  await expect(page.getByText("หยุดอัปเดตอยู่", { exact: true })).toBeVisible();
  await expect(projector.getByText("รอเริ่มงาน", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "พักข้อความ", exact: true })).toBeDisabled();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
    await page.screenshot({ path: `.impeccable/review/polling-stopped-${width}.png`, fullPage: true, animations: "disabled" });
  }
  await page.clock.install();
  await projector.clock.install();
  let stoppedAdminRequests = adminRequests;
  let stoppedProjectorRequests = projectorRequests;
  await page.clock.fastForward(20000);
  await projector.clock.fastForward(20000);
  expect(adminRequests).toBe(stoppedAdminRequests);
  expect(projectorRequests).toBe(stoppedProjectorRequests);

  const message = "ความฝันก่อนเริ่มงาน";
  expect((await request.post("/api/dreams", { data: { dream: message } })).status()).toBe(201);
  await page.getByRole("button", { name: "เช็กข้อมูลตอนนี้", exact: true }).click();
  await expect(page.locator(".dream-list")).toContainText(message);
  await expect(page.getByText("หยุดอัปเดตอยู่", { exact: true })).toBeVisible();
  stoppedAdminRequests = adminRequests;
  await page.clock.fastForward(20000);
  expect(adminRequests).toBe(stoppedAdminRequests);
  await page.reload();
  await projector.reload();
  await expect(page.getByRole("button", { name: "เริ่มอัปเดตอัตโนมัติ", exact: true })).toBeEnabled();
  await expect(projector.getByText("รอเริ่มงาน", { exact: true })).toBeVisible();
  stoppedAdminRequests = adminRequests;
  stoppedProjectorRequests = projectorRequests;
  await page.clock.fastForward(20000);
  await projector.clock.fastForward(20000);
  expect(adminRequests).toBe(stoppedAdminRequests);
  expect(projectorRequests).toBe(stoppedProjectorRequests);

  await page.getByRole("button", { name: "เริ่มอัปเดตอัตโนมัติ", exact: true }).click();
  await expect(page.getByText("อัปเดตอัตโนมัติ", { exact: true })).toBeVisible();
  await expect(projector.getByText("รอเริ่มงาน", { exact: true })).toBeVisible();
  await projector.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(projector.locator(".live-status")).toHaveCount(0);
  const activeAdminRequests = adminRequests;
  const activeProjectorRequests = projectorRequests;
  await page.clock.fastForward(3000);
  await projector.clock.fastForward(3000);
  await expect.poll(() => adminRequests).toBeGreaterThan(activeAdminRequests);
  await expect.poll(() => projectorRequests).toBeGreaterThan(activeProjectorRequests);
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
  await expect(page.locator(".dream-grid.is-current .dream-card")).toContainText(message);

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
  await expect(page.locator(".dream-grid.is-current .dream-card")).toHaveCount(6);
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

test("admin controls pause on every display, while reset and fullscreen still work without public controls", async ({ page, context, request }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(page.locator(".wall-footer button, .wall-footer a")).toHaveCount(0);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  const admin = await context.newPage();
  await admin.goto("/admin");
  await expect(admin.getByRole("button", { name: "พักข้อความ", exact: true })).toBeEnabled();
  await request.post("/api/dreams", { data: { dream: "W".repeat(500) } });
  await expect(page.locator(".arrival p")).toHaveText("W".repeat(64));
  await expect(page.locator(".arrival-tail")).toContainText("ส่วนที่ 1/8");
  const footer = await page.locator(".wall-footer").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(768);
  await page.screenshot({ path: ".impeccable/review/arrival-max-projector.png", fullPage: true, animations: "disabled" });

  await page.clock.install();
  await admin.getByRole("button", { name: "พักข้อความ", exact: true }).click();
  await expect(admin.getByRole("button", { name: "เล่นต่อ", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main")).toHaveClass(/is-paused/);
  await expect(other.locator("main")).toHaveClass(/is-paused/);
  await expect(page.locator(".neptune")).toHaveCSS("animation-play-state", "paused");
  await page.clock.fastForward(20000);
  await expect(page.locator(".arrival-tail")).toContainText("ส่วนที่ 1/8");
  await page.screenshot({ path: ".impeccable/review/paused-projector.png", fullPage: true, animations: "disabled" });

  await admin.getByRole("button", { name: "เล่นต่อ", exact: true }).click();
  await expect(page.locator("main")).not.toHaveClass(/is-paused/);
  await expect(other.locator("main")).not.toHaveClass(/is-paused/);
  await expect(page.locator(".neptune")).toHaveCSS("animation-play-state", "running");
  await page.clock.fastForward(6500);
  await expect(page.locator(".arrival-tail")).toContainText("ส่วนที่ 2/8");
  await admin.getByRole("button", { name: "พักข้อความ", exact: true }).click();
  await expect(page.locator("main")).toHaveClass(/is-paused/);

  const state = await (await request.get("/api/admin/dreams")).json();
  await request.post("/api/admin/reset", { data: { round: state.round, generation: state.generation, confirm: "RESET" } });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  await expect(page.locator(".arrival")).toHaveCount(0);
  await expect(page.locator("main")).not.toHaveClass(/is-paused/);
  await expect(other.locator("main")).not.toHaveClass(/is-paused/);
  await expect(admin.getByRole("button", { name: "พักข้อความ", exact: true })).toBeVisible();
  await page.keyboard.press("f");
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press("f");
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
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

test("reset can restart at round 1, including consecutive uses of the same number", async ({ page, context, request }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
  const admin = await context.newPage();
  await admin.goto("/admin");
  await expect(admin.locator(".round-tag b")).not.toHaveText("—");

  for (let attempt = 0; attempt < 2; attempt++) {
    await request.post("/api/dreams", { data: { dream: `ทดสอบก่อนล้าง ${attempt}` } });
    await expect(page.locator(".arrival")).toContainText(`ทดสอบก่อนล้าง ${attempt}`);
    const before = await (await request.get("/api/admin/dreams")).json();
    await admin.getByRole("button", { name: "รีเซ็ตและเริ่มรอบใหม่" }).click();
    const target = admin.getByLabel("เริ่มที่รอบ", { exact: true });
    await expect(target).toHaveValue(String(before.round + 1));
    await target.fill("1");
    await admin.getByLabel("พิมพ์ RESET เพื่อยืนยันการลบ").fill("RESET");
    if (attempt === 0) {
      await admin.setViewportSize({ width: 1440, height: 900 });
      await admin.evaluate(() => window.scrollTo(0, 0));
      await admin.screenshot({ path: ".impeccable/review/reset-round-desktop.png", animations: "disabled" });
      await admin.setViewportSize({ width: 390, height: 844 });
      await admin.screenshot({ path: ".impeccable/review/reset-round-mobile.png", animations: "disabled" });
      await expect(admin.locator("body")).toHaveJSProperty("scrollWidth", 390);
    }
    await admin.getByRole("button", { name: "ลบทั้งหมดและเริ่มรอบใหม่", exact: true }).click();
    await expect(admin.getByRole("dialog")).not.toBeVisible();
    await expect(admin.locator(".round-tag b")).toHaveText("01");
    await expect(page.locator(".round-tag b")).toHaveText("01");
    await expect(page.getByText("จักรวาลนี้กำลังรอความฝันแรก")).toBeVisible();
    await expect(page.locator(".arrival")).toHaveCount(0);
  }
  await request.post("/api/dreams", { data: { dream: "ความฝันจริงของรอบที่ 1" } });
  await expect(page.locator(".arrival")).toContainText("ความฝันจริงของรอบที่ 1");
});

test("password gate rejects mistakes, remembers login after reload, and logout locks admin again", async ({ page, context }) => {
  await context.clearCookies();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "เข้าสู่หน้าผู้ดูแล" })).toBeVisible();
  expect((await context.request.get("/api/admin/dreams")).status()).toBe(401);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.locator(".login-panel").getByRole("alert")).toContainText("รหัสผ่านไม่ถูกต้อง");
  await page.screenshot({ path: ".impeccable/review/admin-login-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".impeccable/review/admin-login-mobile.png", fullPage: true, animations: "disabled" });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("cpediwa");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ดูแลจักรวาลความฝัน" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "ดูแลจักรวาลความฝัน" })).toBeVisible();
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "เข้าสู่หน้าผู้ดูแล" })).toBeVisible();
  expect((await context.request.get("/api/admin/dreams")).status()).toBe(401);
  expect((await context.request.get("/api/dreams")).status()).toBe(200);
});
