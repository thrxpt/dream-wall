"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="not-found"><h1>การเดินทางสะดุดชั่วคราว</h1><p>โหลดหน้านี้ไม่สำเร็จ กรุณาลองอีกครั้ง</p><button className="button primary" onClick={reset}>ลองอีกครั้ง</button></main>;
}
