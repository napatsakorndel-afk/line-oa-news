# 📰 ระบบส่งข่าว LINE OA อัตโนมัติ: นักสังคมวิทยา & นักการศึกษาเชิงวิพากษ์

ระบบดึงข่าวจริงจากสำนักข่าวไทยและต่างประเทศ วิเคราะห์ผ่านแว่น **ทฤษฎีสังคมวิทยา/รัฐศาสตร์ (Social Theory)** และ **ทฤษฎีการเรียนรู้ (Learning Theory)** ด้วยโทนภาษาอบอุ่นเหมือนเพื่อนชวนคุย พร้อมส่งเข้า **LINE Official Account (LINE OA)** ในรูปแบบการ์ดเลื่อนซ้าย-ขวา (**LINE Flex Message Carousel**) อัตโนมัติวันละ 2 รอบ (**07:30 น.** และ **18:30 น.**)

---

## ✨ จุดเด่นของระบบ
1. **ดึงข่าวจริงพร้อมลิงก์อ้างอิงที่กดอ่านต่อได้ทันที (RSS Feeds 4 หมวดหลัก):**
   - 📚 **หมวดการศึกษาและการเรียนรู้ (ใบแรกสุด):** ข่าวการศึกษาไทย (โรงเรียน, มหาวิทยาลัย, นักเรียน, ครู, กสศ., การเรียนรู้ตลอดชีวิต), The Guardian Education, Thai PBS สังคม/การศึกษา
   - 🏛️ **หมวดการเมืองไทย:** Thai PBS, ประชาไท (Prachatai), BBC News ไทย, The Standard
   - ✊ **หมวดการเคลื่อนไหวทางสังคม:** ประชาไท, Thai PBS สังคม, The Standard
   - 🌍 **หมวดข่าวสำคัญของโลก:** BBC World News, The Guardian, Al Jazeera, Thai PBS ต่างประเทศ
2. **โครงสร้างการเขียนครบ 3 มิติในทุกการ์ดข่าว:**
   - 📌 **สรุปข้อเท็จจริง (What Happened):** กระชับ เข้าใจง่ายใน 3-4 บรรทัด
   - 🔍 **มองผ่านแว่นทฤษฎีสังคม (Social Theory):** เชื่อมโยงทฤษฎีสังคมวิทยา/รัฐศาสตร์เพื่ออธิบายโครงสร้างอำนาจและพลวัตของผู้คน
   - 💡 **เชื่อมโยงทฤษฎีการเรียนรู้ (Learning Theory & Reflection):** ชี้ให้เห็นกระบวนการเรียนรู้ของสังคม พร้อม **"💬 คำถามชวนคิดวันนี้"** ท้ายการ์ด
   - 🔗 **ปุ่มกดอ่านข่าวต้นฉบับ:** กดเปิดลิงก์สำนักข่าวต้นทางจากในแชท LINE ได้ทันที
3. **รันอัตโนมัติ 100% ฟรีผ่าน GitHub Actions:**
   - ตั้งเวลาส่งอัตโนมัติทุกวัน เวลา **07:30 น.** (รอบเช้า) และ **18:30 น.** (รอบเย็น) ตามเวลาประเทศไทย

---

## 📂 โครงสร้างไฟล์ในโปรเจกต์
- [`main.py`](./main.py) — ไฟล์หลักสำหรับสั่งรันระบบ
- [`src/news_fetcher.py`](./src/news_fetcher.py) — ดึงข่าวและลิงก์อ้างอิงจาก RSS สำนักข่าวไทยและต่างประเทศ
- [`src/ai_analyzer.py`](./src/ai_analyzer.py) — ชุดคำสั่ง System Prompt และตัววิเคราะห์ข่าวด้วย Gemini API (`gemini-2.5-flash`)
- [`src/flex_builder.py`](./src/flex_builder.py) — สร้างการ์ด LINE Flex Message Carousel และสร้างไฟล์จำลองหน้าจอ HTML (`preview_flex.html`)
- [`src/line_broadcaster.py`](./src/line_broadcaster.py) — เชื่อมต่อ LINE Messaging API เพื่อ Broadcast หาผู้ติดตามทั้งหมด
- [`.github/workflows/daily_news_broadcast.yml`](./.github/workflows/daily_news_broadcast.yml) — ตั้งเวลาส่งข่าวอัตโนมัติบน GitHub Actions

---

## 🚀 วิธีตั้งค่าใช้งานจริง (5 นาทีเสร็จ)

### ขั้นตอนที่ 1: ขอ API Keys ทั้ง 2 ตัว
1. **Gemini API Key:**
   - ไปที่ [Google AI Studio](https://aistudio.google.com/app/apikey) กด **Create API Key**
2. **LINE Channel Access Token (สำหรับ LINE OA):**
   - ไปที่ [LINE Official Account Manager](https://manager.line.biz/) -> สร้างบัญชี LINE OA ของคุณ
   - เข้าไปที่ **ตั้งค่า (Settings) > Messaging API** แล้วกด **เปิดใช้งาน Messaging API (Enable Messaging API)**
   - ไปที่ [LINE Developers Console](https://developers.line.biz/console/) เลือก Channel ของคุณ -> ไปที่แท็บ **Messaging API** -> เลื่อนลงมาด้านล่างสุดที่หัวข้อ **Channel access token (long-lived)** แล้วกด **Issue** เพื่อคัดลอกรหัส Token

### ขั้นตอนที่ 2: ทดสอบรันบนเครื่องคอมพิวเตอร์ของคุณ
1. ติดตั้งแพ็กเกจ Python:
   ```bash
   pip install -r requirements.txt
   ```
2. คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วใส่ค่า API Key ของคุณ
3. ทดสอบสร้างการ์ดข่าวและดูตัวอย่างหน้าจอก่อนส่งจริง:
   ```bash
   python main.py --round morning --dry-run
   ```
   *(เมื่อรันเสร็จ สามารถดับเบิลคลิกเปิดไฟล์ `preview_flex.html` เพื่อดูหน้าตาการ์ดข่าวได้เลย)*
4. ส่งเข้า LINE OA จริง:
   ```bash
   python main.py --round morning
   ```

### ขั้นตอนที่ 3: เปิดรันอัตโนมัติบน GitHub Actions (07:30 น. และ 18:30 น.)
1. อัปโหลดโค้ดในโฟลเดอร์นี้ขึ้น GitHub Repository ของคุณ
2. ในหน้า GitHub Repository ไปที่ **Settings > Secrets and variables > Actions**
3. กดปุ่ม **New repository secret** แล้วเพิ่มค่าทั้ง 2 ตัวนี้:
   - `GEMINI_API_KEY` = ใส่ Gemini API Key ของคุณ
   - `LINE_CHANNEL_ACCESS_TOKEN` = ใส่ Channel Access Token ของ LINE OA
4. ไปที่แท็บ **Actions** บน GitHub กดเปิดใช้งาน Workflow ระบบจะส่งข่าวเข้า LINE OA ให้คุณอัตโนมัติทุกเช้า 07:30 น. และทุกเย็น 18:30 น. ทันที!
