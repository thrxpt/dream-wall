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
    if (typeof body.visible !== "boolean") throw new HttpError(400, "กรุณาระบุ visible เป็น true หรือ false");
    return json(await getStore().setFeedbackVisible(body.visible, round, generation));
  });
}
