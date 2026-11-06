import Image from "next/image";

// Deterministic positions keep server and client markup identical.
const stars = Array.from({ length: 85 }, (_, i) => ({
  x: ((i * 73 + 19) % 997) / 10,
  y: ((i * i * 17 + 31) % 991) / 10,
  bright: i % 9 === 0,
}));

export function Sky() {
  return <div className="sky" aria-hidden="true">
    <div className="starfield">{stars.map((star, i) =>
      <i key={i} className={star.bright ? "star bright" : "star"} style={{ left: `${star.x}%`, top: `${star.y}%` }} />
    )}</div>
    <div className="planet-system">
      <div className="orbit orbit-outer" /><div className="orbit orbit-inner" />
      <Image className="neptune" src="/images/neptune.webp" alt="" width={1200} height={1199} priority />
      <span className="orbital-star" />
    </div>
  </div>;
}
