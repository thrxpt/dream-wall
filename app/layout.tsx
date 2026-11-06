import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream Wall · Beyond the Star. Dream Begin.",
  description: "กำแพงความฝันจาก Terminal of Despina · workshop CLI ของ Operation Neptune ภาควิชาวิศวกรรมคอมพิวเตอร์",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
