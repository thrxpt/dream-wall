"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Radio } from "lucide-react";
import { Brand } from "./brand";
import { Sky } from "./sky";
import { Sparkle } from "./sparkle";
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
  const [fullscreenError, setFullscreenError] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const pageFade = useRef<Animation | null>(null);
  const paused = snapshot?.paused ?? false;
  const pollingEnabled = snapshot?.pollingEnabled ?? true;

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError("เปิดเต็มจอไม่สำเร็จ ลองใช้ปุ่ม F11 ของเบราว์เซอร์");
    }
  }, []);

  useEffect(() => {
    if (snapshot) dispatch({ snapshot, paused });
  }, [snapshot, paused]);

  useEffect(() => {
    if (!show.active || paused) return;
    const timer = setTimeout(() => dispatch("advance"), 6500);
    return () => clearTimeout(timer);
  }, [show.active, show.part, paused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!document.fullscreenEnabled || event.key.toLowerCase() !== "f" || event.repeat || event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role='textbox']"))) return;
      event.preventDefault();
      void toggleFullscreen();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen]);

  const changePage = useCallback(async (nextPage: number) => {
    const element = grid.current;
    const opacity = element ? getComputedStyle(element).opacity : "1";
    pageFade.current?.cancel();
    pageFade.current = null;
    if (!element || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !element.animate) {
      setPage(nextPage);
      return;
    }
    const fade = element.animate([{ opacity }, { opacity: 0 }], {
      duration: 220, easing: "ease-in-out", fill: "forwards",
    });
    pageFade.current = fade;
    try { await fade.finished; } catch { return; }
    if (pageFade.current !== fade || grid.current !== element) return;
    pageFade.current = null;
    flushSync(() => setPage(nextPage));
    fade.cancel();
  }, [paused]);

  const dreams = snapshot?.dreams ?? [];
  const slides = dreams.flatMap((dream, index) => {
    const parts = dreamParts(dream.dream);
    return parts.map((text, part) => ({ ...dream, text, part, parts: parts.length, number: index + 1 }));
  });
  const pages = Math.ceil(slides.length / 6);
  const dreamPages = Array.from({ length: pages }, (_, index) => slides.slice(index * 6, index * 6 + 6));
  // Filter against the newest snapshot while the reducer catches up after reset/hide.
  const active = show.generation === snapshot?.generation && dreams.some(d => d.id === show.active?.id) ? show.active : null;
  const activeParts = active ? dreamParts(active.dream) : [];

  // Data changes take precedence over a pending page change.
  useLayoutEffect(() => {
    pageFade.current?.cancel();
    pageFade.current = null;
  }, [snapshot?.revision, paused, active?.id]);

  useEffect(() => () => { pageFade.current?.cancel(); }, []);

  useEffect(() => {
    if (paused || active || pages <= 1) return;
    const timer = setTimeout(() => { void changePage(page + 1); }, 12000);
    return () => clearTimeout(timer);
  }, [paused, active, pages, page, changePage, snapshot?.revision]);

  return <main className={`wall-shell ${dreams.length ? "has-dreams" : ""} ${paused ? "is-paused" : ""}`}>
    <Sky />
    <header className="wall-header">
      <Brand />
      <div className="header-status">
        <span className="round-tag">รอบที่ <b>{snapshot ? String(snapshot.round).padStart(2, "0") : "—"}</b></span>
        {(loading || error || !pollingEnabled) && <span className={`live-status ${error ? "offline" : !pollingEnabled ? "is-idle" : ""}`}><span className="status-dot" />{loading ? "กำลังเชื่อมต่อ" : error ? "กำลังเชื่อมต่อใหม่" : "รอเริ่มงาน"}</span>}
      </div>
    </header>

    <section className="wall-intro" aria-labelledby="event-title">
      <h1 id="event-title">Beyond the Star.<br /><span>Dream Begin.</span></h1>
      <p className="wall-tagline">ให้ความฝันของเธอ ออกเดินทางไกลกว่าดวงดาว</p>
      <p className="workshop-name">Terminal of Despina · CLI Workshop</p>
      <div className="planet-caption"><span /> NEPTUNE <span className="caption-line" /> ดาวแห่งวิศวกรรมคอมพิวเตอร์</div>
    </section>

    {error && <div className="connection-banner" role="status"><Radio size={18} aria-hidden="true" /><span>{error} · {pollingEnabled ? "ระบบจะลองใหม่อัตโนมัติ" : "รีเฟรชหน้านี้เพื่อลองอีกครั้ง"}</span></div>}

    <section className="dream-space" aria-label="กำแพงความฝัน">
      {loading && !snapshot ? <div className="empty-sky"><OrbitLoader /><h2>กำลังเปิดประตูสู่จักรวาล</h2><p>กำลังเชื่อมต่อกำแพงความฝัน</p></div>
      : !snapshot ? <div className="empty-sky"><Radio size={36} strokeWidth={1.2} aria-hidden="true" /><h2>ยังเชื่อมต่อกำแพงไม่ได้</h2><p>ตรวจสอบการเชื่อมต่อ ระบบจะลองใหม่ให้เอง</p></div>
      : dreams.length === 0 ? <div className="empty-sky"><Sparkle size={36} /><h2>จักรวาลนี้กำลังรอความฝันแรก</h2><p>ส่งความฝันจาก CLI แล้วมาดูดาวของเธอที่นี่</p><span className="waiting-line"><span className={`status-dot ${pollingEnabled ? "" : "idle"}`} /> {pollingEnabled ? "พร้อมรับความฝันของทุกคน" : "เตรียมออกเดินทางไปพร้อมกัน"}</span></div>
      : <>
        {active && <div className="arrival" key={active.id} role="status">
          <div className="arrival-label"><Sparkle size={18} /> ความฝันดวงใหม่เดินทางมาถึงแล้ว</div>
          <p key={show.part} className={show.part > 0 ? "dream-part" : undefined}>{activeParts[show.part]}</p>
          <span className="arrival-tail">{activeParts.length > 1 ? `ส่วนที่ ${show.part + 1}/${activeParts.length} · ความฝันดวงเดียวกัน` : "อีกหนึ่งความฝัน อีกหนึ่งจุดเริ่มต้น"} <Sparkle size={14} /></span>
        </div>}
        {!active && <div className="dream-pages" key={snapshot.generation}>
          {dreamPages.map((pageDreams, index) => {
            const current = index === page % pages;
            return <div ref={current ? grid : undefined} className={`dream-grid${current ? " is-current" : ""}`} key={index} aria-hidden={!current} inert={!current}>
              {pageDreams.map((dream) => <article className="dream-card" key={`${dream.id}-${dream.part}`}>
                <Sparkle className="dream-star" size={17} />
                <p>{dream.text}</p>
                <span className="dream-signature">{dream.parts > 1 ? `ความฝันดวงที่ ${dream.number} · ส่วน ${dream.part + 1}/${dream.parts}` : "A DREAM BEYOND THE STARS"}<span>{String(dream.number).padStart(2, "0")}</span></span>
              </article>)}
            </div>;
          })}
        </div>}
        {!active && pages > 1 && <div className="wall-pagination" aria-label={`หน้าที่ ${page % pages + 1} จาก ${pages}`}>
          {Array.from({ length: pages }, (_, i) => <button key={i} className={i === page % pages ? "current" : ""} aria-label={`แสดงความฝันหน้าที่ ${i + 1}`} aria-current={i === page % pages ? "page" : undefined} onClick={() => { if (i !== page % pages) void changePage(i); }} />)}
        </div>}
      </>}
    </section>

    <footer className="wall-footer">
      <span className="dream-count"><Sparkle size={18} /><b>{dreams.length}</b> ความฝันในจักรวาลนี้</span>
      <span className="footer-motto">Every dream starts somewhere. Yours starts here.</span>
    </footer>
    {fullscreenError && <p className="fullscreen-error" role="alert">{fullscreenError}</p>}
  </main>;
}

function OrbitLoader() {
  return <span className="orbit-loader" aria-hidden="true"><span /></span>;
}
