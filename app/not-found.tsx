import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><h1>หลงวงโคจรนิดหน่อย</h1><p>ไม่มีหน้าที่คุณกำลังตามหา</p><Link className="button primary" href="/">กลับไปกำแพงความฝัน</Link></main>;
}
