import { handleApi, json, parseRound, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-session";
import { HttpError } from "@/lib/errors";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  return handleApi(async () => {
    await requireAdmin();
    const body = await readJson(request);
    const round = parseRound(body);
    const generation = parseRound(body, "generation");
    if (typeof body.paused !== "boolean") throw new HttpError(400, "กรุณาระบุ paused เป็น true หรือ false");
    return json(await getStore().setPaused(body.paused, round, generation));
  });
}
