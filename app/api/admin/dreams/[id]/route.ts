import { handleApi, json, parseRound, readJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { getStore } from "@/lib/store";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireAdmin();
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, "รหัสความฝันไม่ถูกต้อง");
    const body = await readJson(request);
    const round = parseRound(body);
    const generation = parseRound(body, "generation");
    if (typeof body.hidden !== "boolean") throw new HttpError(400, "hidden ต้องเป็น true หรือ false");
    return json(await getStore().moderate(id, body.hidden, round, generation));
  });
}
