import Image from "next/image";
import sparkle from "@/assets/sparkle.png";

export function Sparkle({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Image src={sparkle} alt="" aria-hidden="true" width={size} height={size} className={`sparkle ${className}`} unoptimized loading="eager" />;
}
