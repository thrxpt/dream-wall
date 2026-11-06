import { handleApi, json } from "@/lib/api";
import { getStore } from "@/lib/store";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    return json(await getStore().snapshot(true));
  });
}
