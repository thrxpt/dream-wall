# Dream Wall · Beyond the Star. Dream Begin.

กำแพงความฝันธีมดาวเนปจูนสำหรับ final mission ของ workshop CLI รองรับประมาณ 40 คนต่อรอบ ข้อความขึ้นจออัตโนมัติและเก็บใน PostgreSQL ถาวรจนกดรีเซ็ต

## หน้าจอ

- `/` — จอโปรเจกเตอร์ แสดงความฝันใหม่ก่อนแล้ววนแสดงครั้งละ 6 ส่วนข้อความ ทุก 12 วินาที ข้อความยาวแบ่งเป็นส่วนที่อ่านง่ายโดยไม่ตัดเนื้อหา
- `/admin` — ค้นหา ซ่อน/แสดงความฝัน และรีเซ็ตเพื่อเริ่มรอบใหม่ เลือกเลขในช่อง **เริ่มที่รอบ** ได้ เช่น กลับไปเริ่มรอบ 1 หลังทดสอบ ค่าเริ่มต้นเป็นเลขรอบถัดไป ต้องพิมพ์ `RESET` ก่อนล้าง
- ทุกจอโหลดข้อมูลล่าสุดทุก 2 วินาที และลองเชื่อมต่อใหม่เองเมื่อเครือข่ายหลุด ขณะเปิดอัปเดตอัตโนมัติ
- ปุ่ม **หยุดอัปเดตอัตโนมัติ** ใน `/admin` หยุดเช็กตามเวลาทุกจอรวมโปรเจกเตอร์ สถานะคงอยู่หลังโหลดหน้าใหม่ และไม่ปิดรับความฝัน กด **เช็กข้อมูลตอนนี้** เพื่อโหลดครั้งเดียวได้ เมื่อกด **เริ่มอัปเดตอัตโนมัติ** ให้รีเฟรชหรือสลับกลับไปที่แท็บโปรเจกเตอร์เพื่อให้จอนั้นเริ่มเช็กต่อ การเปิดหน้าใหม่หรือกลับมาที่แท็บจะเช็กสถานะครั้งหนึ่งแม้กำลังหยุดอยู่ การรีเซ็ตไม่เปิดอัปเดตกลับเอง
- เข้า `/admin` เพื่อพัก/เล่นข้อความต่อบนทุกจอ สถานะถูกบันทึกไว้แม้โหลดหน้าใหม่ และรีเซ็ตจะกลับมาเล่นอัตโนมัติ ปุ่มพักหยุดการเปลี่ยนหน้า ไฮไลต์ และแอนิเมชันพื้นหลัง แต่ยังรับข้อมูล การซ่อน และรีเซ็ตอยู่ ข้อความไฮไลต์ยาวแบ่งเป็นส่วนอ่านได้และเปลี่ยนทุก 6.5 วินาที
- หน้าจอสาธารณะไม่มีปุ่มควบคุมหรือลิงก์ผู้ดูแล ใช้ปุ่ม `F` เข้า/ออกเต็มจอ

หน้า `/admin` ต้องใส่รหัสผ่านก่อนใช้งาน รวมถึง API ดูข้อมูลผู้ดูแล ซ่อน/แสดง และรีเซ็ต รหัสที่กำหนดไว้ฝั่งเซิร์ฟเวอร์อยู่ใน `lib/admin-session.ts` ตามที่ผู้ใช้ร้องขอ ไม่ส่งรหัสไปใน JavaScript ของหน้าเว็บ เมื่อล็อกอินจะจดจำด้วย signed HttpOnly cookie นาน 12 ชั่วโมง มีปุ่มออกจากระบบ ส่วนจอโปรเจกเตอร์และ `POST /api/dreams` ยังใช้งานได้โดยไม่ต้องล็อกอิน

## รันในเครื่อง

ต้องมี Node.js 22.13 ขึ้นไป และ Docker

```sh
npm ci
cp .env.example .env.local
docker compose up -d --wait
npm run db:setup
npm run dev
```

เปิด `http://localhost:3000` และ `http://localhost:3000/admin` ฐานข้อมูล local เก็บใน Docker volume จึงยังอยู่หลังปิดและเปิดใหม่ `db:setup` รันซ้ำได้โดยไม่ลบข้อมูลเดิม

## Deploy บน Vercel

1. นำ repository นี้เข้า Vercel เลือก framework **Next.js** ใช้คำสั่ง build และ output ตามค่าเริ่มต้น เลือก Node.js 22.x หรือใหม่กว่า
2. ที่ **Storage / Marketplace** เพิ่มฐานข้อมูล **Neon Postgres** สำหรับโปรเจกต์นี้ หรือใช้ PostgreSQL ที่มีอยู่แล้ว เลือก region ใกล้กับ Vercel Functions
3. ตั้งค่า environment variable **`DATABASE_URL`** เป็น connection string แบบ pooled ของฐานข้อมูล เช่น `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` หาก integration ให้ชื่ออื่น ให้เพิ่ม `DATABASE_URL` ที่อ้างถึงค่าการเชื่อมต่อของมัน
4. เตรียมตาราง **หนึ่งครั้งก่อนใช้งาน**: ตั้งค่า `DATABASE_URL` ของ production ใน shell ที่ปลอดภัย หรือใน `.env.local` ที่ไม่ commit แล้วรัน `npm run db:setup` ด้วย connection string นั้น ขั้นตอนนี้ไม่ลบความฝันเดิม จากนั้นคืน `.env.local` เป็นฐานข้อมูล local หากจะพัฒนาต่อ
5. Deploy หรือ Redeploy หลังตั้งค่า environment variables เสร็จ เปิด `/` และ `/admin` เพื่อตรวจว่าเชื่อมต่อได้
6. ปิด **Vercel Deployment Protection / Vercel Authentication** สำหรับ deployment ที่ใช้จริง เพื่อให้เครื่องน้อง ๆ ส่ง API ได้โดยไม่ต้องล็อกอิน Vercel

ใช้ฐานข้อมูลสำหรับ **Preview** แยกจาก **Production** เพื่อไม่ให้การลองรีเซ็ตบน preview ล้างข้อมูลในงานจริง ไม่ใช้ SQLite, ไฟล์ local, หน่วยความจำของ Function หรือ Vercel filesystem เป็นที่เก็บความฝัน

การ build ไม่ต้องเชื่อมต่อฐานข้อมูล แต่ API จะแจ้ง `503` จนกว่าจะมี `DATABASE_URL` และเตรียมตารางเรียบร้อย ไม่มี credentials ฝังในโค้ดหรือส่งไปที่เบราว์เซอร์

## API สำหรับ workshop

ส่ง **`POST /api/dreams`** พร้อม `Content-Type: application/json`

```json
{"dream":"อยากสร้างเกมที่ทำให้ทุกคนยิ้มได้"}
```

ไม่ต้องมีชื่อ รหัสผู้เรียน หรือ API key ใช้คำสั่ง Windows ที่เตรียมไว้แล้ว เปลี่ยน URL เป็น `https://YOUR-PROJECT.vercel.app/api/dreams`

ตอบกลับ `201 Created` เมื่อบันทึกลงฐานข้อมูลสำเร็จ:

```json
{
  "ok": true,
  "message": "ความฝันของคุณเดินทางถึงดาวเนปจูนแล้ว",
  "id": "UUID",
  "round": 1
}
```

`dream` ต้องเป็นข้อความไม่ว่าง ความยาวไม่เกิน **500 Unicode code points** รับภาษาไทย emoji และหลายบรรทัด จำกัด request body ที่ 8 KiB ข้อความแสดงเป็น text เสมอ ไม่ประมวลผล HTML คำขอจาก CLI ไม่ต้องมี header `Origin`

ข้อผิดพลาดตอบเป็น `{"error":"คำอธิบาย"}`: `400` ข้อมูลไม่ถูกต้อง, `413` body ใหญ่เกิน, `415` content type ไม่ถูกต้อง, `503` ฐานข้อมูลยังไม่พร้อมหรือเชื่อมต่อไม่ได้

| Method | Endpoint | ข้อมูล |
| --- | --- | --- |
| GET | `/api/dreams` | `{round, generation, revision, paused, pollingEnabled, dreams}` เฉพาะข้อความที่แสดงบนจอ |
| GET | `/api/admin/dreams` | `{round, generation, revision, paused, pollingEnabled, dreams}` รวมข้อความที่ซ่อน |
| PATCH | `/api/admin/dreams/:id` | `{"hidden":true,"round":1,"generation":1}` ซ่อน; ใช้ `false` เพื่อแสดงอีกครั้ง |
| PATCH | `/api/admin/playback` | `{"paused":true,"round":1,"generation":1}` พักทุกจอ; ใช้ `false` เพื่อเล่นต่อ |
| PATCH | `/api/admin/polling` | `{"enabled":false,"round":1,"generation":1}` หยุดเช็กข้อมูลอัตโนมัติทุกจอ; ใช้ `true` เพื่อเปิดกลับ |
| POST | `/api/admin/reset` | `{"confirm":"RESET","round":1,"generation":1,"nextRound":1}` ลบทั้งหมดและเริ่มตามเลขที่เลือก; ไม่ส่ง `nextRound` จะเพิ่มเลขรอบ 1 |

`round` และ `generation` ในคำขอผู้ดูแลต้องมาจาก snapshot ปัจจุบัน `generation` เปลี่ยนทุกครั้งที่รีเซ็ต แม้เลือกใช้เลขรอบเดิม จึงป้องกันคำขอเก่าล้างข้อมูลใหม่ได้ เลขรอบต้องเป็นจำนวนเต็มบวกไม่เกิน 2147483647 หากอัปเดตจากรุ่นก่อน ให้รัน `npm run db:setup` กับฐานข้อมูลที่ใช้งานอีกครั้งก่อน deploy เพื่อเพิ่มคอลัมน์ `generation`, `paused` และ `polling_enabled` โดยเก็บข้อมูลเดิม และรีเฟรชหน้าผู้ดูแลหลัง deploy

API ผู้ดูแลต้องมี session cookie จาก `POST /api/admin/session` พร้อม JSON `{"password":"รหัสที่กำหนดไว้"}` มิฉะนั้นตอบ `401` ออกจากระบบด้วย `DELETE /api/admin/session` พร้อม JSON `{}` เบราว์เซอร์จัดการ cookie ให้อัตโนมัติหลังเข้าสู่ระบบ

ทุกการแก้ไขล็อก state ของรอบใน PostgreSQL transaction คำสั่งรีเซ็ตซ้ำหรือการแก้ไขจากหน้าผู้ดูแลที่ค้างอยู่ในรอบเก่าจะได้ `409` โดยไม่ลบข้อมูลรอบใหม่ ข้อความที่ส่งพร้อมรีเซ็ตนับอยู่ในรอบที่ transaction บันทึกสำเร็จ: ก่อนรีเซ็ตจะถูกล้าง หลังรีเซ็ตจะอยู่ในรอบใหม่ API ส่งความฝันคง payload `{"dream":"..."}` ตามที่กำหนด จึงไม่ระบุรอบจากฝั่งผู้ส่ง

## ทดสอบ

```sh
npm test
npm run build
```

ทดสอบ API และเบราว์เซอร์ใช้ฐานข้อมูล local แยกต่างหาก ชื่อฐานข้อมูลต้องลงท้าย `_test` และ host ต้องเป็น `localhost` หรือ `127.0.0.1` เพื่อป้องกันการล้างข้อมูลจริง

```sh
docker compose exec -T db createdb -U dreamwall dreamwall_test
```

สร้าง `.env.test` (ไม่ commit) ด้วยค่า:

```dotenv
TEST_DATABASE_URL=postgresql://dreamwall:dreamwall@localhost:54329/dreamwall_test
```

```sh
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

API tests เตรียมตารางให้ฐานข้อมูลทดสอบ และตรวจการส่งพร้อมกัน 40 คน การซ่อน/แสดง ความถูกต้องของ input การรีเซ็ตซ้ำและการส่งพร้อมรีเซ็ต Browser tests เปิดจอพร้อมกันสองหน้าต่างและตรวจว่าคิวความฝันเก่าไม่กลับมาหลังล้าง รวมถึง mobile layout, HTML injection และ keyboard focus ของหน้าต่างยืนยัน

ใช้พอร์ต 3099 และ 3100 สำหรับ test server ปิด server ให้อัตโนมัติ ภาพตรวจ layout อยู่ใน `.impeccable/review/` และไม่ commit

## Assets

ภาพ Neptune: NASA/JPL, Voyager 2, PIA01492 ดูที่มาใน [public/images/README.md](public/images/README.md) ฟอนต์ Manrope และ Noto Sans Thai ถูกเสิร์ฟจากตัวแอป ไม่ต้องเรียก Google Fonts ในงาน
