"use client";

import { useEffect, useReducer, useState } from "react";
import { ArrowUpRight, Expand, Minimize, Pause, Play, Radio, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { Sky } from "./sky";
import { useWall } from "@/lib/use-wall";
import { advanceShow, emptyShow, reconcileShow, type ShowState } from "@/lib/show";
import type { WallSnapshot } from "@/lib/contracts";
import { dreamParts } from "@/lib/contracts";

function showReducer(state: ShowState, event: { snapshot: WallSnapshot; paused: boolean } | "advance") {
  return event === "advance" ? advanceShow(state) : reconcileShow(state, event.snapshot, event.paused);
}

export function DreamWall() {
  const { snapshot, error, loading } = useWall();
  const [show, dispatch] = useReducer(showReducer, emptyShow);
  const [page, setPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (snapshot) dispatch({ snapshot, paused });
  }, [snapshot, paused]);

  useEffect(() => {
    if (!show.active || paused) return;
    const timer = setTimeout(() => dispatch("advance"), 6500);
    return () => clearTimeout(timer);
  }, [show.active, show.part, paused]);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setPage(p => p + 1), 12000);
    return () => clearInterval(timer);
  }, [paused]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError("เปิดเต็มจอไม่สำเร็จ ลองใช้ปุ่ม F11 ของเบราว์เซอร์");
    }
  }

  const dreams = snapshot?.dreams ?? [];
  const slides = dreams.flatMap((dream, index) => {
    const parts = dreamParts(dream.dream);
    return parts.map((text, part) => ({ ...dream, text, part, parts: parts.length, number: index + 1 }));
  });
  const pages = Math.ceil(slides.length / 6);
  const visibleDreams = slides.slice((page % Math.max(1, pages)) * 6, (page % Math.max(1, pages)) * 6 + 6);
  // Filter against the newest snapshot while the reducer catches up after reset/hide.
  const active = show.generation === snapshot?.generation && dreams.some(d => d.id === show.active?.id) ? show.active : null;
  const activeParts = active ? dreamParts(active.dream) : [];

  return <main className={`wall-shell ${dreams.length ? "has-dreams" : ""}`}>
    <Sky />
    <header className="wall-header">
      <Brand />
      <div className="header-status">
        <span className="round-tag">รอบที่ <b>{snapshot ? String(snapshot.round).padStart(2, "0") : "—"}</b></span>
        <span className={`live-status ${error ? "offline" : ""}`}><span className="status-dot" />{loading ? "กำลังเชื่อมต่อ" : error ? "กำลังเชื่อมต่อใหม่" : "รับความฝันแบบสด"}</span>
      </div>
    </header>

    <section className="wall-intro" aria-labelledby="event-title">
      <h1 id="event-title">Beyond the Star.<br /><span>Dream Begin.</span></h1>
      <p>ให้ความฝันของเธอ ออกเดินทางไกลกว่าดวงดาว</p>
      <div className="planet-caption"><span /> NEPTUNE <span className="caption-line" /> ดาวแห่งวิศวกรรมคอมพิวเตอร์</div>
    </section>

    {error && <div className="connection-banner" role="status"><Radio size={18} aria-hidden="true" /><span>{error} · ระบบจะลองใหม่อัตโนมัติ</span></div>}

    <section className="dream-space" aria-label="กำแพงความฝัน">
      {loading && !snapshot ? <div className="empty-sky"><OrbitLoader /><h2>กำลังเปิดประตูสู่จักรวาล</h2><p>กำลังเชื่อมต่อกำแพงความฝัน</p></div>
      : !snapshot ? <div className="empty-sky"><Radio size={36} strokeWidth={1.2} aria-hidden="true" /><h2>ยังเชื่อมต่อกำแพงไม่ได้</h2><p>ตรวจสอบการเชื่อมต่อ ระบบจะลองใหม่ให้เอง</p></div>
      : dreams.length === 0 ? <div className="empty-sky"><Sparkles size={36} strokeWidth={1.2} aria-hidden="true" /><h2>จักรวาลนี้กำลังรอความฝันแรก</h2><p>ส่งความฝันจาก CLI แล้วมาดูดาวของเธอที่นี่</p><span className="waiting-line"><span className="status-dot" /> พร้อมรับความฝันของทุกคน</span></div>
      : <>
        {active && <div className="arrival" key={active.id} role="status">
          <div className="arrival-label"><Sparkles size={18} aria-hidden="true" /> ความฝันดวงใหม่เดินทางมาถึงแล้ว</div>
          <p>{activeParts[show.part]}</p>
          <span className="arrival-tail">{activeParts.length > 1 ? `ส่วนที่ ${show.part + 1}/${activeParts.length} · ความฝันดวงเดียวกัน` : "อีกหนึ่งความฝัน อีกหนึ่งจุดเริ่มต้น"} <Star size={14} aria-hidden="true" /></span>
        </div>}
        {!active && <div className="dream-grid" key={`${snapshot.generation}-${page % Math.max(1, pages)}`}>
          {visibleDreams.map((dream) => <article className="dream-card" key={`${dream.id}-${dream.part}`}>
            <Star className="dream-star" size={17} strokeWidth={1.5} aria-hidden="true" />
            <p>{dream.text}</p>
            <span className="dream-signature">{dream.parts > 1 ? `ความฝันดวงที่ ${dream.number} · ส่วน ${dream.part + 1}/${dream.parts}` : "A DREAM BEYOND THE STARS"}<span>{String(dream.number).padStart(2, "0")}</span></span>
          </article>)}
        </div>}
        {!active && pages > 1 && <div className="wall-pagination" aria-label={`หน้าที่ ${page % pages + 1} จาก ${pages}`}>
          {Array.from({ length: pages }, (_, i) => <button key={i} className={i === page % pages ? "current" : ""} aria-label={`แสดงความฝันหน้าที่ ${i + 1}`} aria-current={i === page % pages ? "page" : undefined} onClick={() => setPage(i)} />)}
        </div>}
      </>}
    </section>

    <footer className="wall-footer">
      <span className="dream-count"><Star size={18} aria-hidden="true" /><b>{dreams.length}</b> ความฝันในจักรวาลนี้</span>
      <span className="footer-motto">Every dream starts somewhere. Yours starts here.</span>
      <div className="footer-controls"><Link href="/admin" className="admin-link" aria-label="เปิดหน้าผู้ดูแล">ผู้ดูแล <ArrowUpRight size={14} aria-hidden="true" /></Link>
        <button className="playback-button" onClick={() => setPaused(p => !p)} aria-pressed={paused}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}{paused ? "เล่นต่อ" : "พักข้อความ"}</button>
        {canFullscreen && <button className="fullscreen-button" onClick={toggleFullscreen}>{fullscreen ? <Minimize size={16} aria-hidden="true" /> : <Expand size={16} aria-hidden="true" />}{fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}</button>}
      </div>
    </footer>
    {fullscreenError && <p className="fullscreen-error" role="alert">{fullscreenError}</p>}
  </main>;
}

function OrbitLoader() {
  return <span className="orbit-loader" aria-hidden="true"><span /></span>;
}
