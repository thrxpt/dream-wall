import { MAX_DREAM_LENGTH } from "./contracts";
import { HttpError } from "./errors";

const headers = { "Cache-Control": "no-store, max-age=0" };
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

export async function handleApi(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const code = (error as { code?: string }).code;
    console.error("Dream Wall request failed", code ?? "unexpected error");
    return json({ error: code === "42P01"
      ? "ยังไม่ได้เตรียมฐานข้อมูล กรุณารัน npm run db:setup"
      : "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง" }, 503);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw new HttpError(415, "กรุณาส่ง Content-Type: application/json");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  if (!request.body) throw new HttpError(400, "กรุณาส่งข้อมูล JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new HttpError(413, "ข้อมูลมีขนาดใหญ่เกินไป");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Expected object");
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "รูปแบบ JSON ไม่ถูกต้อง");
  }
}

export function parseDream(body: Record<string, unknown>) {
  if (typeof body.dream !== "string") throw new HttpError(400, "dream ต้องเป็นข้อความ");
  const dream = body.dream.trim().normalize("NFC");
  if (!dream || !dream.isWellFormed() || [...dream].length > MAX_DREAM_LENGTH || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(dream)) {
    throw new HttpError(400, `กรุณาส่งความฝันที่มีความยาว 1–${MAX_DREAM_LENGTH} ตัวอักษร`);
  }
  return dream;
}

export function parseRound(body: Record<string, unknown>) {
  if (typeof body.round !== "number" || !Number.isSafeInteger(body.round) || body.round < 1) {
    throw new HttpError(400, "กรุณาระบุ round เป็นเลขรอบปัจจุบัน");
  }
  return body.round;
}
