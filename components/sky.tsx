"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkle } from "./sparkle";

// Deterministic positions keep server and client markup identical.
const stars = Array.from({ length: 85 }, (_, i) => ({
  x: ((i * 73 + 19) % 997) / 10,
  y: ((i * i * 17 + 31) % 991) / 10,
  bright: i % 9 === 0,
  rotation: ((i * 137 + 43) % 31) - 15,
  duration: `${3.6 + ((i * 7) % 25) / 10}s`,
  delay: `${-((i * 13) % 61) / 10}s`,
}));

export function Sky() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return <div className={`sky${hidden ? " is-inactive" : ""}`} aria-hidden="true">
    <div className="starfield">{stars.map((star, i) =>
      <i key={i} className={star.bright ? "star bright" : "star"} style={{ left: `${star.x}%`, top: `${star.y}%`, animationDuration: star.duration, animationDelay: star.delay, transform: star.bright ? `rotate(${star.rotation}deg)` : undefined }}>{star.bright && <Sparkle size={14} />}</i>
    )}</div>
    <div className="planet-system">
      <div className="orbit orbit-outer" /><div className="orbit orbit-inner" />
      <Image className="neptune" src="/images/neptune.webp" alt="" width={1200} height={1199} priority />
      <span className="orbital-star" />
    </div>
  </div>;
}
