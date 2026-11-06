import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import postgres from "postgres";
import { createHmac, randomUUID } from "node:crypto";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("TEST_DATABASE_URL must point to a local database whose name ends in _test. Tests erase this database's wall data.");
}
const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
const base = "http://localhost:3099";
let server: ChildProcess;
let serverLog = "";
let adminCookie = "";

async function request(path: string, body?: unknown, method = "POST") {
  return fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    ...(body === undefined ? {} : { method, body: JSON.stringify(body) }),
  });
}
async function submit(dream: string) {
  const response = await request("/api/dreams", { dream });
  assert.equal(response.status, 201);
  return response.json();
}

before(async () => {
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3099"], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", chunk => { serverLog = (serverLog + chunk).slice(-3000); });
  server.stderr?.on("data", chunk => { serverLog = (serverLog + chunk).slice(-3000); });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/api/dreams`)).ok) {
        const login = await request("/api/admin/session", { password: "cpediwa" });
        assert.equal(login.status, 200);
        adminCookie = login.headers.get("set-cookie")!.split(";")[0];
        return;
      }
    } catch { /* Wait for startup. */ }
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Test server did not start: ${serverLog}`);
});
beforeEach(async () => { await sql`TRUNCATE dreams`; await sql`UPDATE wall_state SET round = 1, generation = 1, revision = 0, paused = false, polling_enabled = true WHERE id = 1`; });
after(async () => {
  if (server && server.exitCode === null) { const exited = once(server, "exit"); server.kill("SIGTERM"); await exited; }
  await sql.end();
});

test("40 simultaneous Thai JSON submissions are persisted and visible", async () => {
  const responses = await Promise.all(Array.from({ length: 40 }, (_, i) => submit(`ความฝันที่ ${i + 1}: อยากเป็นวิศวกรคอมพิวเตอร์`)));
  assert.equal(new Set(responses.map(r => r.id)).size, 40);
  const response = await request("/api/dreams");
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const snapshot = await response.json();
  assert.equal(snapshot.dreams.length, 40);
  assert.equal(snapshot.revision, 40);
  assert.equal(snapshot.round, 1);
  const [row] = await sql`SELECT count(*)::int AS count FROM dreams`;
  assert.equal(row.count, 40);
});

test("hide removes a dream from public data, keeps it in admin, and restore works", async () => {
  const dream = await submit("อยากสร้างสิ่งใหม่");
  assert.equal((await request(`/api/admin/dreams/${dream.id}`, { hidden: true, round: 1, generation: 1 }, "PATCH")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).dreams.length, 0);
  const admin = await (await request("/api/admin/dreams")).json();
  assert.equal(admin.dreams[0].hidden, true);
  assert.equal((await request(`/api/admin/dreams/${dream.id}`, { hidden: false, round: 1, generation: 1 }, "PATCH")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).dreams.length, 1);
});

test("reset deletes hidden and visible dreams and rejects repeated resets or stale moderation", async () => {
  const dream = await submit("ก่อนรีเซ็ต");
  await request(`/api/admin/dreams/${dream.id}`, { hidden: true, round: 1, generation: 1 }, "PATCH");
  await submit("อีกความฝัน");
  assert.equal((await request("/api/admin/reset", { round: 1 })).status, 400);
  const reset = await request("/api/admin/reset", { round: 1, generation: 1, confirm: "RESET" });
  assert.equal(reset.status, 200);
  assert.deepEqual((await reset.json()).dreams, []);
  const next = await submit("ความฝันรอบใหม่");
  assert.equal(next.round, 2);
  assert.equal((await request("/api/admin/reset", { round: 1, generation: 1, confirm: "RESET" })).status, 409);
  assert.equal((await request(`/api/admin/dreams/${next.id}`, { hidden: true, round: 1, generation: 1 }, "PATCH")).status, 409);
  const snapshot = await (await request("/api/admin/dreams")).json();
  assert.equal(snapshot.round, 2);
  assert.deepEqual(snapshot.dreams.map((d: { dream: string }) => d.dream), ["ความฝันรอบใหม่"]);
});

test("two concurrent resets advance once and a racing submission cannot leak old data", async () => {
  await submit("old round");
  const [reset1, reset2, arrival] = await Promise.all([
    request("/api/admin/reset", { round: 1, generation: 1, confirm: "RESET" }),
    request("/api/admin/reset", { round: 1, generation: 1, confirm: "RESET" }),
    submit("racing dream"),
  ]);
  assert.deepEqual([reset1.status, reset2.status].sort(), [200, 409]);
  const snapshot = await (await request("/api/dreams")).json();
  assert.equal(snapshot.round, 2);
  assert.ok(snapshot.dreams.every((d: { dream: string }) => d.dream !== "old round"));
  assert.equal(snapshot.dreams.length, arrival.round === 2 ? 1 : 0);
});

test("invalid input fails before a write, and HTML is returned as text data", async () => {
  for (const body of [{}, { dream: " " }, { dream: 123 }, { dream: "a".repeat(501) }]) {
    assert.equal((await request("/api/dreams", body)).status, 400);
  }
  assert.equal((await fetch(`${base}/api/admin/reset`, { method: "POST", headers: { "Content-Type": "application/json", origin: "https://foreign.test", Cookie: adminCookie }, body: '{"round":1,"confirm":"RESET"}' })).status, 403);
  assert.equal((await request("/api/dreams")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).revision, 0);
  const html = '<img src=x onerror="alert(1)">';
  await submit(html);
  assert.equal((await (await request("/api/dreams")).json()).dreams[0].dream, html);
});

test("404 moderation rolls back the revision and setup is nondestructive", async () => {
  await submit("keep me");
  assert.equal((await request("/api/admin/dreams/00000000-0000-4000-8000-000000000000", { hidden: true, round: 1, generation: 1 }, "PATCH")).status, 404);
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const snapshot = await (await request("/api/dreams")).json();
  assert.equal(snapshot.revision, 1);
  assert.equal(snapshot.dreams[0].dream, "keep me");
});

test("reset can reuse round 1 without a stale reset deleting fresh dreams", async () => {
  await submit("ล้างการทดสอบ");
  const body = { round: 1, generation: 1, nextRound: 1, confirm: "RESET" };
  const responses = await Promise.all([request("/api/admin/reset", body), request("/api/admin/reset", body)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  let state = await (await request("/api/admin/dreams")).json();
  assert.equal(state.round, 1);
  assert.equal(state.generation, 2);
  assert.deepEqual(state.dreams, []);
  const next = await submit("ความฝันจริงของรอบ 1");
  assert.equal((await request("/api/admin/reset", body)).status, 409);
  assert.equal((await request(`/api/admin/dreams/${next.id}`, { round: 1, generation: 1, hidden: true }, "PATCH")).status, 409);
  state = await (await request("/api/admin/dreams")).json();
  assert.equal(state.dreams[0].dream, "ความฝันจริงของรอบ 1");
  assert.equal(state.dreams[0].hidden, false);
});

test("reset accepts a chosen later round and rejects invalid targets without deleting data", async () => {
  await submit("เก็บไว้จนยืนยันถูกต้อง");
  for (const nextRound of [0, -1, 1.5, "1", null, 2_147_483_648]) {
    assert.equal((await request("/api/admin/reset", { round: 1, generation: 1, nextRound, confirm: "RESET" })).status, 400);
  }
  assert.equal((await request("/api/admin/reset", { round: 1, nextRound: 1, confirm: "RESET" })).status, 400);
  assert.equal((await (await request("/api/admin/dreams")).json()).dreams.length, 1);
  const response = await request("/api/admin/reset", { round: 1, generation: 1, nextRound: 7, confirm: "RESET" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).round, 7);
  const next = await request("/api/admin/reset", { round: 7, generation: 2, confirm: "RESET" });
  assert.equal((await next.json()).round, 8);
});

test("playback is shared, persisted, validated and reset starts playing again", async () => {
  for (const paused of [undefined, null, "true", 1]) {
    assert.equal((await request("/api/admin/playback", { round: 1, generation: 1, paused }, "PATCH")).status, 400);
  }
  assert.equal((await request("/api/admin/playback", { round: 1, paused: true }, "PATCH")).status, 400);
  assert.equal((await (await request("/api/dreams")).json()).revision, 0);
  assert.equal((await request("/api/admin/playback", { round: 1, generation: 1, paused: true }, "PATCH")).status, 200);
  await submit("ส่งได้แม้จอพักอยู่");
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  for (const path of ["/api/dreams", "/api/admin/dreams"]) {
    const snapshot = await (await request(path)).json();
    assert.equal(snapshot.paused, true);
    assert.equal(snapshot.revision, 2);
    assert.equal(snapshot.dreams.length, 1);
  }
  assert.equal((await request("/api/admin/playback", { round: 1, generation: 1, paused: false }, "PATCH")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).paused, false);
  await request("/api/admin/playback", { round: 1, generation: 1, paused: true }, "PATCH");
  const reset = await (await request("/api/admin/reset", { round: 1, generation: 1, nextRound: 1, confirm: "RESET" })).json();
  assert.equal(reset.paused, false);
  assert.equal((await request("/api/admin/playback", { round: 1, generation: 1, paused: true }, "PATCH")).status, 409);
  const snapshot = await (await request("/api/dreams")).json();
  assert.equal(snapshot.paused, false);
  assert.equal(snapshot.revision, reset.revision);
});

test("polling can stop globally without blocking submissions, persists through setup and reset, and rejects stale actions", async () => {
  for (const enabled of [undefined, null, "false", 0]) {
    assert.equal((await request("/api/admin/polling", { round: 1, generation: 1, enabled }, "PATCH")).status, 400);
  }
  assert.equal((await request("/api/admin/polling", { round: 1, enabled: false }, "PATCH")).status, 400);
  assert.equal((await (await request("/api/dreams")).json()).revision, 0);
  assert.equal((await request("/api/admin/polling", { round: 1, generation: 1, enabled: false }, "PATCH")).status, 200);
  await submit("เก็บความฝันไว้ก่อนเริ่มงาน");
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  for (const path of ["/api/dreams", "/api/admin/dreams"]) {
    const snapshot = await (await request(path)).json();
    assert.equal(snapshot.pollingEnabled, false);
    assert.equal(snapshot.paused, false);
    assert.equal(snapshot.dreams.length, 1);
    assert.equal(snapshot.revision, 2);
  }
  const reset = await (await request("/api/admin/reset", { round: 1, generation: 1, nextRound: 1, confirm: "RESET" })).json();
  assert.equal(reset.pollingEnabled, false);
  assert.equal((await request("/api/admin/polling", { round: 1, generation: 1, enabled: true }, "PATCH")).status, 409);
  assert.equal((await request("/api/admin/polling", { round: 1, generation: reset.generation, enabled: true }, "PATCH")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).pollingEnabled, true);
});

test("admin page and all management APIs require a session while CLI submission stays public", async () => {
  const page = await fetch(`${base}/admin`);
  const html = await page.text();
  assert.ok(html.includes("เข้าสู่หน้าผู้ดูแล"));
  assert.ok(!html.includes("ดูแลจักรวาลความฝัน"));
  assert.ok(!html.includes("cpediwa"));
  const submission = await fetch(`${base}/api/dreams`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"dream":"ไม่ต้องล็อกอินตอนส่งความฝัน"}' });
  assert.equal(submission.status, 201);
  const { id } = await submission.json();
  for (const [path, method, body] of [
    ["/api/admin/dreams", "GET", undefined],
    [`/api/admin/dreams/${id}`, "PATCH", { hidden: true, round: 1, generation: 1 }],
    ["/api/admin/reset", "POST", { round: 1, generation: 1, nextRound: 1, confirm: "RESET" }],
    ["/api/admin/playback", "PATCH", { round: 1, generation: 1, paused: true }],
    ["/api/admin/polling", "PATCH", { round: 1, generation: 1, enabled: false }],
  ] as const) {
    assert.equal((await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })).status, 401);
  }
  assert.equal((await (await request("/api/dreams")).json()).dreams[0].hidden, false);
});

test("incorrect passwords, forged cookies and expired sessions cannot grant admin access", async () => {
  for (const password of ["wrong", "", null, " cpediwa", 123]) {
    const response = await fetch(`${base}/api/admin/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  const payload = `${Date.now() - 1000}.${randomUUID()}`;
  const expired = `${payload}.${createHmac("sha256", "cpediwa").update(`dream-wall-admin:${payload}`).digest("hex")}`;
  const last = adminCookie.at(-1) === "0" ? "1" : "0";
  for (const cookie of ["dream-wall-admin=cpediwa", adminCookie.slice(0, -1) + last, `dream-wall-admin=${expired}`]) {
    assert.equal((await fetch(`${base}/api/admin/dreams`, { headers: { Cookie: cookie } })).status, 401);
    assert.ok((await (await fetch(`${base}/admin`, { headers: { Cookie: cookie } })).text()).includes("เข้าสู่หน้าผู้ดูแล"));
  }
});

test("login issues a protected cookie and logout expires it", async () => {
  const login = await request("/api/admin/session", { password: "cpediwa" });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.match(cookie, /Max-Age=43200/i);
  assert.ok(!cookie.includes("cpediwa"));
  const logout = await request("/api/admin/session", {}, "DELETE");
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/i);
  const crossOrigin = await fetch(`${base}/api/admin/session`, { method: "POST", headers: { "Content-Type": "application/json", origin: "https://foreign.test" }, body: '{"password":"cpediwa"}' });
  assert.equal(crossOrigin.status, 403);
});
