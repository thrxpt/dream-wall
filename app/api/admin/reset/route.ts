import { handleApi, json, parseRound, readJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { getStore } from "@/lib/store";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdmin();
    const body = await readJson(request);
    const round = parseRound(body);
    const generation = parseRound(body, "generation");
    const nextRound = parseRound({ nextRound: body.nextRound === undefined ? round + 1 : body.nextRound }, "nextRound");
    if (body.confirm !== "RESET") throw new HttpError(400, "กรุณายืนยันการล้างข้อมูลด้วย RESET");
    return json(await getStore().reset(round, generation, nextRound));
  });
}
