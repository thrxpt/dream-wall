import { randomUUID } from "node:crypto";
import postgres, { type Sql } from "postgres";
import type { Dream, WallSnapshot } from "./contracts";
import { HttpError } from "./errors";

// Every mutation locks the singleton state row first. A reset cannot interleave
// with a submission or moderation, and each snapshot is one MVCC-consistent query.
export class DreamStore {
  constructor(private sql: Sql) {}

  async snapshot(includeHidden = false): Promise<WallSnapshot> {
    const [state] = await this.sql`
      SELECT s.round, s.generation, s.revision, s.paused, s.polling_enabled AS "pollingEnabled", s.feedback_visible AS "feedbackVisible",
        COALESCE((SELECT json_agg(json_build_object(
          'id', d.id, 'dream', d.dream, 'createdAt', d.created_at, 'hidden', d.hidden
        ) ORDER BY d.created_at ASC, d.id ASC)
        FROM dreams d WHERE ${includeHidden} OR NOT d.hidden), '[]'::json) AS dreams
      FROM wall_state s WHERE s.id = 1
    `;
    if (!state) throw new HttpError(503, "ยังไม่ได้เตรียมฐานข้อมูล กรุณารัน npm run db:setup");
    return state as WallSnapshot;
  }

  async submit(dream: string) {
    return this.sql.begin(async (sql) => {
      const [state] = await sql<{ round: number; revision: number }[]>`UPDATE wall_state SET revision = revision + 1 WHERE id = 1 RETURNING round, revision`;
      if (!state) throw new HttpError(503, "ยังไม่ได้เตรียมฐานข้อมูล");
      const [entry] = await sql`
        INSERT INTO dreams (id, dream) VALUES (${randomUUID()}, ${dream})
        RETURNING id, dream, created_at AS "createdAt", hidden
      `;
      return { ...state, entry: entry as Dream };
    });
  }

  async moderate(id: string, hidden: boolean, round: number, generation: number) {
    return this.sql.begin(async (sql) => {
      const [state] = await sql<{ revision: number }[]>`
        UPDATE wall_state SET revision = revision + 1
        WHERE id = 1 AND round = ${round} AND generation = ${generation} RETURNING revision
      `;
      if (!state) throw new HttpError(409, "รอบเปลี่ยนแล้ว กรุณารอข้อมูลล่าสุดแล้วลองอีกครั้ง");
      const [entry] = await sql`UPDATE dreams SET hidden = ${hidden} WHERE id = ${id} RETURNING id`;
      if (!entry) throw new HttpError(404, "ไม่พบความฝันนี้ อาจถูกล้างไปแล้ว");
      return { ok: true, revision: state.revision };
    });
  }

  async setPaused(paused: boolean, round: number, generation: number) {
    const [state] = await this.sql<{ revision: number; paused: boolean }[]>`
      UPDATE wall_state SET paused = ${paused}, revision = revision + 1
      WHERE id = 1 AND round = ${round} AND generation = ${generation} RETURNING revision, paused
    `;
    if (!state) throw new HttpError(409, "รอบเปลี่ยนแล้ว กรุณารอข้อมูลล่าสุดแล้วลองอีกครั้ง");
    return { ok: true, ...state };
  }

  async setPollingEnabled(enabled: boolean, round: number, generation: number) {
    const [state] = await this.sql<{ revision: number; pollingEnabled: boolean }[]>`
      UPDATE wall_state SET polling_enabled = ${enabled}, revision = revision + 1
      WHERE id = 1 AND round = ${round} AND generation = ${generation} RETURNING revision, polling_enabled AS "pollingEnabled"
    `;
    if (!state) throw new HttpError(409, "รอบเปลี่ยนแล้ว กรุณารอข้อมูลล่าสุดแล้วลองอีกครั้ง");
    return { ok: true, ...state };
  }

  async setFeedbackVisible(visible: boolean, round: number, generation: number) {
    const [state] = await this.sql<{ revision: number; feedbackVisible: boolean }[]>`
      UPDATE wall_state SET feedback_visible = ${visible}, revision = revision + 1
      WHERE id = 1 AND round = ${round} AND generation = ${generation} RETURNING revision, feedback_visible AS "feedbackVisible"
    `;
    if (!state) throw new HttpError(409, "รอบเปลี่ยนแล้ว กรุณารอข้อมูลล่าสุดแล้วลองอีกครั้ง");
    return { ok: true, ...state };
  }

  async reset(round: number, generation: number, nextRound: number) {
    return this.sql.begin(async (sql) => {
      const [state] = await sql<Omit<WallSnapshot, "dreams">[]>`
        UPDATE wall_state SET round = ${nextRound}, generation = generation + 1, revision = revision + 1, paused = false
        WHERE id = 1 AND round = ${round} AND generation = ${generation} RETURNING round, generation, revision, paused, polling_enabled AS "pollingEnabled", feedback_visible AS "feedbackVisible"
      `;
      if (!state) throw new HttpError(409, "รอบนี้ถูกรีเซ็ตแล้ว กรุณารอข้อมูลล่าสุด");
      await sql`DELETE FROM dreams`;
      return { ...state, dreams: [] } as WallSnapshot;
    });
  }
}

let store: DreamStore | undefined;
export function getStore() {
  if (!process.env.DATABASE_URL) {
    throw new HttpError(503, "ยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาตั้งค่า DATABASE_URL และรัน npm run db:setup");
  }
  store ??= new DreamStore(postgres(process.env.DATABASE_URL, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  }));
  return store;
}
