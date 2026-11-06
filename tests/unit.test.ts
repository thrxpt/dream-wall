import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDream, parseRound, readJson } from "../lib/api";
import { dreamParts, type Dream, type WallSnapshot } from "../lib/contracts";
import { advanceShow, emptyShow, reconcileShow } from "../lib/show";

const dream = (id: string): Dream => ({ id, dream: `ความฝัน ${id}`, createdAt: "2026-11-06T00:00:00Z", hidden: false });
const snap = (round: number, dreams: Dream[], generation = round): WallSnapshot => ({ round, generation, revision: 1, paused: false, dreams });

test("dream validation preserves Thai, multiline content and 500 Unicode code points", () => {
  assert.equal(parseDream({ dream: "  อยากสร้างเกม\nให้ทุกคนสนุก  " }), "อยากสร้างเกม\nให้ทุกคนสนุก");
  assert.equal(parseDream({ dream: "🚀".repeat(500) }), "🚀".repeat(500));
  for (const value of [undefined, null, 3, [], "   ", "a".repeat(501), "a\u0000b", "\ud800"]) {
    assert.throws(() => parseDream({ dream: value }), { status: 400 });
  }
});

test("invalid rounds cannot bypass stale-round protection", () => {
  assert.equal(parseRound({ round: 1 }), 1);
  for (const round of [0, -1, "1", 1.5, null, Infinity, 2_147_483_648]) assert.throws(() => parseRound({ round }), { status: 400 });
  assert.equal(parseRound({ nextRound: 1 }, "nextRound"), 1);
  assert.throws(() => parseRound({}, "generation"), { status: 400 });
});

test("JSON boundary rejects form posts, foreign origins, malformed JSON and oversized streams", async () => {
  const request = (body: string, headers = {}) => new Request("http://localhost/api/dreams", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  assert.deepEqual(await readJson(request('{"dream":"hello"}')), { dream: "hello" });
  await assert.rejects(readJson(request("{}", { "content-type": "text/plain" })), { status: 415 });
  await assert.rejects(readJson(request("{}", { origin: "https://elsewhere.test" })), { status: 403 });
  for (const body of ["{", "null", "[]", '"hello"']) await assert.rejects(readJson(request(body)), { status: 400 });
  await assert.rejects(readJson(request("x".repeat(8193))), { status: 413 });
});

test("arrival queue handles simultaneous submissions once without re-celebrating initial content", () => {
  let show = reconcileShow(emptyShow, snap(1, [dream("old")]));
  assert.equal(show.active, null);
  show = reconcileShow(show, snap(1, [dream("old"), dream("a"), dream("b")]));
  assert.equal(show.active?.id, "a");
  assert.deepEqual(show.queue.map(d => d.id), ["b"]);
  show = reconcileShow(show, snap(1, [dream("old"), dream("a"), dream("b")]));
  assert.equal(show.queue.length, 1);
  assert.equal(advanceShow(show).active?.id, "b");
});

test("hiding cancels an active dream and a reset erases all queued celebrations", () => {
  let show = reconcileShow(emptyShow, snap(1, []));
  show = reconcileShow(show, snap(1, [dream("a"), dream("b"), dream("c")]));
  show = reconcileShow(show, snap(1, [dream("b"), dream("c")]));
  assert.equal(show.active?.id, "b");
  show = reconcileShow(show, snap(2, []));
  assert.equal(show.active, null);
  assert.deepEqual(show.queue, []);
  assert.deepEqual(show.seen, []);
  show = reconcileShow(show, snap(2, [dream("new")]));
  assert.equal(show.active?.id, "new");
});

test("first snapshot after a reset can include the new round's first submission", () => {
  const show = reconcileShow(reconcileShow(emptyShow, snap(1, [dream("old")])), snap(2, [dream("new")]));
  assert.equal(show.active?.id, "new");
  assert.deepEqual(show.seen, ["new"]);
});

test("reusing round 1 clears the old arrival, queue and seen IDs", () => {
  let show = reconcileShow(reconcileShow(emptyShow, snap(1, [])), snap(1, [dream("old"), dream("queued")]));
  assert.equal(show.active?.id, "old");
  show = reconcileShow(show, snap(1, [], 2));
  assert.deepEqual(show, { ...emptyShow, generation: 2 });
  show = reconcileShow(show, snap(1, [dream("new")], 2));
  assert.equal(show.active?.id, "new");
});

test("featured text advances through bounded parts before moving to the next dream", () => {
  let show = reconcileShow(reconcileShow(emptyShow, snap(1, [])), snap(1, [{ ...dream("wide"), dream: "W".repeat(500) }, dream("next")]));
  for (let part = 0; part < 8; part++) {
    assert.equal(show.active?.id, "wide");
    assert.equal(show.part, part);
    show = advanceShow(show);
  }
  assert.equal(show.active?.id, "next");
  assert.equal(show.part, 0);
});

test("pause queues incoming arrivals but still reconciles moderation and reset", () => {
  let show = reconcileShow(reconcileShow(emptyShow, snap(1, [])), snap(1, [dream("a"), dream("b")]), true);
  assert.equal(show.active, null);
  assert.equal(show.queue.length, 2);
  show = reconcileShow(show, snap(1, [dream("b")]), true);
  assert.deepEqual(show.queue.map(d => d.id), ["b"]);
  show = reconcileShow(show, snap(1, [dream("b")]), false);
  assert.equal(show.active?.id, "b");
  show = reconcileShow(show, snap(2, []), true);
  assert.equal(show.active, null);
  assert.equal(show.queue.length, 0);
});

test("long projector text is split without losing graphemes or any content", () => {
  const text = "ความฝันของฉันคือการสร้างอนาคตที่ดี🚀".repeat(12);
  const parts = dreamParts(text);
  assert.equal(parts.join(""), text);
  const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
  assert.ok(parts.every(part => [...segmenter.segment(part)].length <= 64));
  assert.equal(dreamParts("hello\n\nworld").join(""), "hello world");
});
