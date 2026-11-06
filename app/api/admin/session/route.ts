import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, verifyAdminPassword } from "@/lib/admin-session";
import { handleApi, json, readJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApi(async () => {
    const body = await readJson(request);
    if (!verifyAdminPassword(body.password)) throw new HttpError(401, "รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง");
    (await cookies()).set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
    return json({ ok: true });
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    await readJson(request);
    (await cookies()).set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
    return json({ ok: true });
  });
}
