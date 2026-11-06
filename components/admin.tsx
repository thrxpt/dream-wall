"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, LogOut, RefreshCw, RotateCcw, Search, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { useWall } from "@/lib/use-wall";
import type { Dream, WallSnapshot } from "@/lib/contracts";
import { MAX_ROUND } from "@/lib/contracts";

export function Admin() {
  const router = useRouter();
  const { snapshot, error, loading, refresh, accept } = useWall(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetContext, setResetContext] = useState<Pick<WallSnapshot, "round" | "generation"> | null>(null);
  const [nextRound, setNextRound] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  async function logout() {
    if (pending) return;
    setPending("logout");
    setActionError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      router.refresh();
    } catch {
      setActionError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally { setPending(null); }
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (resetContext && snapshot && resetContext.generation !== snapshot.generation) {
      dialog.current?.close();
      setResetContext(null);
      setConfirmation("");
    }
  }, [resetContext, snapshot]);

  async function moderate(dream: Dream) {
    if (!snapshot || pending) return;
    setPending(dream.id);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/dreams/${dream.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !dream.hidden, round: snapshot.round, generation: snapshot.generation }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotice(dream.hidden ? "แสดงความฝันบนจอแล้ว" : "ซ่อนความฝันจากจอแล้ว");
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
      void refresh();
    } finally { setPending(null); }
  }

  function openReset() {
    if (!snapshot) return;
    setResetContext({ round: snapshot.round, generation: snapshot.generation });
    setNextRound(String(Math.min(snapshot.round + 1, MAX_ROUND)));
    setConfirmation("");
    setActionError("");
    dialog.current?.showModal();
  }

  function closeReset() {
    if (pending === "reset") return;
    dialog.current?.close();
    setResetContext(null);
  }

  async function reset() {
    const target = Number(nextRound);
    if (!resetContext || confirmation !== "RESET" || pending || !Number.isInteger(target) || target < 1 || target > MAX_ROUND) return;
    setPending("reset");
    setActionError("");
    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...resetContext, nextRound: target, confirm: confirmation }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      accept(result as WallSnapshot);
      dialog.current?.close();
      setResetContext(null);
      setConfirmation("");
      setNotice(`เริ่มรอบที่ ${result.round} แล้ว พร้อมรับความฝันใหม่`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "รีเซ็ตไม่สำเร็จ กรุณาลองอีกครั้ง");
      void refresh();
    } finally { setPending(null); }
  }

  const dreams = snapshot?.dreams ?? [];
  const hidden = dreams.filter(d => d.hidden).length;
  const filtered = dreams.filter(d => (filter === "all" || (filter === "hidden" ? d.hidden : !d.hidden)) && d.dream.toLocaleLowerCase().includes(search.toLocaleLowerCase())).toReversed();

  return <main className="admin-shell">
    <header className="admin-header"><Link href="/" aria-label="กลับไปกำแพงความฝัน"><Brand /></Link><div className="admin-header-actions"><Link className="button secondary" href="/" target="_blank" rel="noopener noreferrer">เปิดจอโปรเจกเตอร์ <ArrowUpRight size={17} aria-hidden="true" /></Link><button className="button quiet" onClick={() => void logout()} disabled={Boolean(pending)}><LogOut size={17} aria-hidden="true" />{pending === "logout" ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button></div></header>
    <div className="admin-content">
      <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden="true" /> กลับไปกำแพงความฝัน</Link>
      <section className="admin-title"><div><h1>ดูแลจักรวาลความฝัน</h1><p>จัดการข้อความบนจอ และเตรียมพื้นที่สำหรับความฝันในรอบถัดไป</p></div><span className="round-tag">รอบที่ <b>{snapshot ? String(snapshot.round).padStart(2, "0") : "—"}</b></span></section>
      {(error || (actionError && resetContext === null)) && <div className="admin-error" role="alert"><span>{actionError || error}</span><button className="text-button" onClick={() => void refresh()}><RefreshCw size={15} aria-hidden="true" /> ลองใหม่</button></div>}
      {notice && <div className="admin-success" role="status"><Check size={17} aria-hidden="true" />{notice}</div>}

      <section className="dream-management" aria-labelledby="dream-list-title">
        <div className="list-heading"><h2 id="dream-list-title"><Star size={21} aria-hidden="true" /> ความฝันในรอบนี้ <span>{dreams.length}</span></h2><span className="list-live"><span className={`status-dot ${error ? "disconnected" : ""}`} />{loading ? "กำลังโหลด" : error ? "ขาดการเชื่อมต่อ" : "อัปเดตอัตโนมัติ"}</span></div>
        <div className="list-toolbar"><div className="filter-tabs" aria-label="กรองความฝัน">{[["all", `ทั้งหมด ${dreams.length}`], ["visible", `บนจอ ${dreams.length - hidden}`], ["hidden", `ซ่อน ${hidden}`]].map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={filter === key ? "selected" : ""} aria-pressed={filter === key}>{label}</button>)}</div><label className="search-field"><Search size={17} aria-hidden="true" /><input type="search" aria-label="ค้นหาความฝัน" placeholder="ค้นหาความฝัน…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
        {!snapshot ? <div className="admin-empty"><Star size={32} aria-hidden="true" /><h3>{loading ? "กำลังโหลดความฝัน" : "ยังเชื่อมต่อฐานข้อมูลไม่ได้"}</h3><p>{loading ? "รอสักครู่ กำลังรับข้อมูลจากจักรวาล" : "ตรวจสอบ DATABASE_URL และเตรียมฐานข้อมูลตาม README"}</p></div>
        : filtered.length === 0 ? <div className="admin-empty"><Star size={32} aria-hidden="true" /><h3>{dreams.length ? "ไม่พบความฝันที่ตรงกับตัวกรอง" : "ยังไม่มีความฝันในรอบนี้"}</h3><p>{dreams.length ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เมื่อน้อง ๆ ส่งความฝันผ่าน API ข้อความจะปรากฏที่นี่"}</p></div>
        : <ul className="dream-list">{filtered.map(dream => <li key={dream.id} className={dream.hidden ? "hidden-dream" : ""}><span className="list-star"><Star size={18} aria-hidden="true" /></span><div className="dream-list-body"><p>{dream.dream}</p><span><time dateTime={dream.createdAt}>{new Date(dream.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })} น.</time><span className={`visibility-label ${dream.hidden ? "is-hidden" : ""}`}>{dream.hidden ? "ซ่อนจากจอ" : "กำลังแสดงบนจอ"}</span></span></div><button className={`button ${dream.hidden ? "secondary" : "quiet"}`} disabled={Boolean(pending) || Boolean(error)} onClick={() => void moderate(dream)} aria-label={`${dream.hidden ? "แสดง" : "ซ่อน"}ความฝัน: ${dream.dream}`}>{dream.hidden ? <Eye size={17} aria-hidden="true" /> : <EyeOff size={17} aria-hidden="true" />}{pending === dream.id ? "กำลังบันทึก…" : dream.hidden ? "แสดงบนจอ" : "ซ่อน"}</button></li>)}</ul>}
      </section>

      <section className="reset-section"><div><h2><RotateCcw size={20} aria-hidden="true" /> พร้อมสำหรับรอบถัดไป?</h2><p>ล้างความฝันทั้งหมด รวมถึงข้อความที่ซ่อน แล้วเริ่มรอบใหม่บนทุกจอ</p></div><button className="button danger-outline" onClick={openReset} disabled={!snapshot || Boolean(error) || Boolean(pending)}><RotateCcw size={17} aria-hidden="true" /> รีเซ็ตและเริ่มรอบใหม่</button></section>
      <footer className="admin-footer">Beyond the Star. Dream Begin. <span>COMPUTER ENGINEERING · NEPTUNE</span></footer>
    </div>

    <dialog ref={dialog} className="reset-dialog" aria-labelledby="reset-title" aria-describedby="reset-description" onCancel={e => { if (pending === "reset") e.preventDefault(); else setResetContext(null); }} onClose={() => { setResetContext(null); setConfirmation(""); }}>
      <button className="dialog-close icon-button" onClick={closeReset} disabled={pending === "reset"} aria-label="ปิดหน้าต่างยืนยัน"><X size={21} aria-hidden="true" /></button>
      <span className="reset-icon"><RotateCcw size={26} aria-hidden="true" /></span><h2 id="reset-title">เริ่มจักรวาลรอบใหม่?</h2>
      <p id="reset-description">ความฝันทั้งหมดในรอบที่ {resetContext?.round} จะถูกลบถาวร รวมถึงข้อความที่ซ่อน จอโปรเจกเตอร์จะว่างและเริ่มตามเลขรอบที่คุณกำหนด</p>
      <form onSubmit={e => { e.preventDefault(); void reset(); }}>
        <div className="reset-round-field"><label htmlFor="reset-next-round">เริ่มที่รอบ</label><input id="reset-next-round" type="number" inputMode="numeric" min={1} max={MAX_ROUND} step={1} required value={nextRound} disabled={pending === "reset"} onChange={e => setNextRound(e.target.value)} aria-describedby="reset-round-hint" /><p id="reset-round-hint">ตั้งเป็น 1 เพื่อเริ่มงานหลังทดสอบ หรือเลือกเลขรอบที่ต้องการ</p></div>
        <label htmlFor="reset-confirm">พิมพ์ <strong>RESET</strong> เพื่อยืนยันการลบ</label><input id="reset-confirm" autoComplete="off" autoFocus value={confirmation} disabled={pending === "reset"} onChange={e => setConfirmation(e.target.value)} placeholder="RESET" />
        {actionError && <p className="dialog-error" role="alert">{actionError}</p>}
        <div className="dialog-actions"><button className="button secondary" type="button" onClick={closeReset} disabled={pending === "reset"}>ยกเลิก</button><button className="button danger" type="submit" disabled={confirmation !== "RESET" || Boolean(pending)}>{pending === "reset" ? "กำลังเริ่มรอบใหม่…" : "ลบทั้งหมดและเริ่มรอบใหม่"}</button></div>
      </form>
    </dialog>
  </main>;
}
