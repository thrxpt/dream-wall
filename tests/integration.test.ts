import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import postgres from "postgres";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("TEST_DATABASE_URL must point to a local database whose name ends in _test. Tests erase this database's wall data.");
}
const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
const base = "http://localhost:3099";
let server: ChildProcess;
let serverLog = "";

async function request(path: string, body?: unknown, method = "POST") {
  return fetch(`${base}${path}`, body === undefined ? undefined : {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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
    try { if ((await fetch(`${base}/api/dreams`)).ok) return; } catch { /* Wait for startup. */ }
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Test server did not start: ${serverLog}`);
});
beforeEach(async () => { await sql`TRUNCATE dreams`; await sql`UPDATE wall_state SET round = 1, revision = 0 WHERE id = 1`; });
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
  assert.equal((await request(`/api/admin/dreams/${dream.id}`, { hidden: true, round: 1 }, "PATCH")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).dreams.length, 0);
  const admin = await (await request("/api/admin/dreams")).json();
  assert.equal(admin.dreams[0].hidden, true);
  assert.equal((await request(`/api/admin/dreams/${dream.id}`, { hidden: false, round: 1 }, "PATCH")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).dreams.length, 1);
});

test("reset deletes hidden and visible dreams and rejects repeated resets or stale moderation", async () => {
  const dream = await submit("ก่อนรีเซ็ต");
  await request(`/api/admin/dreams/${dream.id}`, { hidden: true, round: 1 }, "PATCH");
  await submit("อีกความฝัน");
  assert.equal((await request("/api/admin/reset", { round: 1 })).status, 400);
  const reset = await request("/api/admin/reset", { round: 1, confirm: "RESET" });
  assert.equal(reset.status, 200);
  assert.deepEqual((await reset.json()).dreams, []);
  const next = await submit("ความฝันรอบใหม่");
  assert.equal(next.round, 2);
  assert.equal((await request("/api/admin/reset", { round: 1, confirm: "RESET" })).status, 409);
  assert.equal((await request(`/api/admin/dreams/${next.id}`, { hidden: true, round: 1 }, "PATCH")).status, 409);
  const snapshot = await (await request("/api/admin/dreams")).json();
  assert.equal(snapshot.round, 2);
  assert.deepEqual(snapshot.dreams.map((d: { dream: string }) => d.dream), ["ความฝันรอบใหม่"]);
});

test("two concurrent resets advance once and a racing submission cannot leak old data", async () => {
  await submit("old round");
  const [reset1, reset2, arrival] = await Promise.all([
    request("/api/admin/reset", { round: 1, confirm: "RESET" }),
    request("/api/admin/reset", { round: 1, confirm: "RESET" }),
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
  assert.equal((await fetch(`${base}/api/admin/reset`, { method: "POST", headers: { "Content-Type": "application/json", origin: "https://foreign.test" }, body: '{"round":1,"confirm":"RESET"}' })).status, 403);
  assert.equal((await request("/api/dreams")).status, 200);
  assert.equal((await (await request("/api/dreams")).json()).revision, 0);
  const html = '<img src=x onerror="alert(1)">';
  await submit(html);
  assert.equal((await (await request("/api/dreams")).json()).dreams[0].dream, html);
});

test("404 moderation rolls back the revision and setup is nondestructive", async () => {
  await submit("keep me");
  assert.equal((await request("/api/admin/dreams/00000000-0000-4000-8000-000000000000", { hidden: true, round: 1 }, "PATCH")).status, 404);
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const snapshot = await (await request("/api/dreams")).json();
  assert.equal(snapshot.revision, 1);
  assert.equal(snapshot.dreams[0].dream, "keep me");
});
