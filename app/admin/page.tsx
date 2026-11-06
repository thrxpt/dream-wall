import type { Metadata } from "next";
import { Admin } from "@/components/admin";

export const metadata: Metadata = { title: "ผู้ดูแล · Dream Wall" };
export default function AdminPage() {
  return <Admin />;
}
