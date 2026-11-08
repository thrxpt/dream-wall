import type { Metadata } from "next";
import { Admin } from "@/components/admin";
import { AdminLogin } from "@/components/admin-login";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Admin · Dream Wall" };
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  return validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value) ? <Admin /> : <AdminLogin />;
}
