import { handleApi, json } from "@/lib/api";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return handleApi(async () => json(await getStore().snapshot(true)));
}
