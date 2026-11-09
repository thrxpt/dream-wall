import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./errors";

// Server-only: never import this module from a client component.
export const ADMIN_COOKIE = "dream-wall-admin";
export const SESSION_SECONDS = 12 * 60 * 60;

function configuredAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  return password?.trim() ? password : undefined;
}

export function verifyAdminPassword(value: unknown) {
  const password = configuredAdminPassword();
  if (typeof value !== "string" || !password) return false;
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(value), hash(password));
}

function sign(payload: string, password: string) {
  return createHmac("sha256", password).update(`dream-wall-admin:${payload}`).digest("hex");
}

export function createAdminSession(now = Date.now()) {
  const password = configuredAdminPassword();
  if (!password) throw new Error("ADMIN_PASSWORD must be configured to create an admin session");
  const payload = `${now + SESSION_SECONDS * 1000}.${randomUUID()}`;
  return `${payload}.${sign(payload, password)}`;
}

export function validAdminSession(token: string | undefined, now = Date.now()) {
  const password = configuredAdminPassword();
  if (!token || !password) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS * 1000) return false;
  return timingSafeEqual(Buffer.from(parts[2], "hex"), Buffer.from(sign(`${parts[0]}.${parts[1]}`, password), "hex"));
}

export async function requireAdmin() {
  if (!validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) {
    throw new HttpError(401, "กรุณาเข้าสู่ระบบผู้ดูแลก่อนดำเนินการ");
  }
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};
