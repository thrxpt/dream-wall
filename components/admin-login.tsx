"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Brand } from "./brand";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    if (pending || !password) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      setPassword("");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error && error.name === "Error" ? error.message : "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally { setPending(false); }
  }

  return <main className="admin-shell">
    <header className="admin-header"><Link href="/" aria-label="กลับไปกำแพงความฝัน"><Brand /></Link><Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden="true" /> กลับไปกำแพงความฝัน</Link></header>
    <div className="admin-login">
      <section className="login-panel" aria-labelledby="login-title">
        <LockKeyhole size={30} strokeWidth={1.5} aria-hidden="true" />
        <h1 id="login-title">เข้าสู่หน้าผู้ดูแล</h1>
        <p>ใส่รหัสผ่านเพื่อจัดการความฝันและเริ่มรอบใหม่</p>
        <form onSubmit={e => { e.preventDefault(); void login(); }}>
          <label htmlFor="admin-password">รหัสผ่าน</label>
          <input id="admin-password" type="password" autoComplete="current-password" autoFocus required value={password} disabled={pending} onChange={e => { setPassword(e.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
          {error && <p id="login-error" className="dialog-error" role="alert">{error}</p>}
          <button className="button primary" type="submit" disabled={pending || !password}>{pending ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
        </form>
      </section>
    </div>
  </main>;
}
