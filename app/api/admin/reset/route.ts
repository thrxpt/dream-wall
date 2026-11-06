import { handleApi, json, parseRound, readJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleApi(async () => {
    const body = await readJson(request);
    const round = parseRound(body);
    if (body.confirm !== "RESET") throw new HttpError(400, "กรุณายืนยันการล้างข้อมูลด้วย RESET");
    return json(await getStore().reset(round));
  });
}
