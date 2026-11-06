"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WallSnapshot } from "./contracts";

export function useWall(admin = false) {
  const [snapshot, setSnapshot] = useState<WallSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const pollingEnabled = snapshot?.pollingEnabled ?? true;

  const accept = useCallback((next: WallSnapshot) => {
    setSnapshot((previous) => previous && previous.revision > next.revision ? previous : next);
  }, []);

  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch(admin ? "/api/admin/dreams" : "/api/dreams", {
        cache: "no-store",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(admin ? data.error || "โหลดความฝันไม่สำเร็จ" : "กำลังเชื่อมต่อกำแพงความฝันอีกครั้ง");
      if (sequence.current !== current) return;
      accept(data);
      setError(null);
    } catch (error) {
      if (request.signal.aborted || sequence.current !== current) return;
      setError(admin && error instanceof Error && error.name !== "TimeoutError"
        ? error.message : "กำลังเชื่อมต่อกำแพงความฝันอีกครั้ง");
    } finally {
      if (sequence.current === current && !request.signal.aborted) setLoading(false);
    }
  }, [accept, admin]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    if (pollingEnabled) void poll();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, pollingEnabled]);

  return { snapshot, error, loading, refresh, accept };
}
