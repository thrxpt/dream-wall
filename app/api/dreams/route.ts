import { handleApi, json, parseDream, readJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleApi(async () => json(await getStore().snapshot()));
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const dream = parseDream(await readJson(request));
    const { round, entry } = await getStore().submit(dream);
    return json({ ok: true, message: "ความฝันของคุณเดินทางถึงดาวเนปจูนแล้ว", id: entry.id, round }, 201);
  });
}
