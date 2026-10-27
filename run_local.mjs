/**
 * สคริปต์รันระบบดึงข่าวจริง + วิเคราะห์ด้วย Gemini (นักสังคมวิทยา & นักการศึกษาเชิงวิพากษ์)
 * + สร้างการ์ด LINE Flex Message Carousel และส่งเข้า LINE Official Account
 * รองรับการรันบนเครื่อง Windows ทันทีด้วย Node.js โดยไม่ต้องลงไลบรารีเสริม
 *
 * วิธีรันทดสอบ (ดึงข่าวจริงและสร้าง preview_flex.html + latest_flex_payload.json):
 *   node run_local.mjs --round morning --dry-run
 * วิธีรันส่งเข้า LINE OA จริง:
 *   node run_local.mjs --round morning
 */

import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const RSS_FEEDS = {
  education_learning: [
    {
      name: "ข่าวการศึกษาและการเรียนรู้",
      url: "https://news.google.com/rss/search?q=%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%A8%E0%B8%B6%E0%B8%81%E0%B8%A9%E0%B8%B2+OR+%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B8%A3%E0%B8%B9%E0%B9%89+OR+%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99+OR+%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2+OR+%E0%B8%81%E0%B8%AA%E0%B8%A8&hl=th&gl=TH&ceid=TH:th",
    },
    { name: "ประชาไท (การศึกษา/เยาวชน)", url: "https://prachatai.com/rss.xml" },
  ],
  thai_politics: [
    { name: "BBC News ไทย", url: "https://feeds.bbci.co.uk/thai/rss.xml" },
    { name: "ประชาไท (Prachatai)", url: "https://prachatai.com/rss.xml" },
  ],
  social_movement: [
    { name: "ประชาไท (สิทธิมนุษยชน/สังคม)", url: "https://prachatai.com/rss.xml" },
    { name: "BBC News ไทย", url: "https://feeds.bbci.co.uk/thai/rss.xml" },
  ],
  world_news: [
    {
      name: "ข่าวต่างประเทศ (สำนักข่าวไทย)",
      url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=th&gl=TH&ceid=TH:th",
    },
    {
      name: "ข่าวสถานการณ์โลก",
      url: "https://news.google.com/rss/search?q=%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%95%E0%B9%88%E0%B8%B2%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%97%E0%B8%A8+OR+%E0%B8%AA%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%90+OR+%E0%B8%A2%E0%B8%B8%E0%B9%82%E0%B8%A3%E0%B8%9B+OR+%E0%B8%95%E0%B8%B0%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%AD%E0%B8%AD%E0%B8%81%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87&hl=th&gl=TH&ceid=TH:th",
    },
  ],
};

function decodeEntities(str = "") {
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " ");
}

function cleanXmlText(str = "") {
  // 1. ถอด CDATA และแปลง HTML entities 2 รอบ (ป้องกัน &lt;a href=...&gt; ที่ซ้อนอยู่ใน RSS)
  let s = String(str).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = decodeEntities(decodeEntities(s));
  // 2. ลบ HTML tags ทั้งหมด เช่น <a href="...">, <font color="...">, </a>
  s = s.replace(/<[^>]+>/g, " ");
  // 3. ลบช่องว่างซ้ำซ้อน
  return s.replace(/\s+/g, " ").trim().slice(0, 420);
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseRssItems(xml, sourceName, maxItems = 4) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const sourceTagMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    let title = cleanXmlText(titleMatch ? titleMatch[1] : "");
    const url = cleanXmlText(linkMatch ? linkMatch[1] : "");
    let summary = cleanXmlText(descMatch ? descMatch[1] : "");
    const publisher = cleanXmlText(sourceTagMatch ? sourceTagMatch[1] : "");

    // หากเป็น Google News RSS มักจะมี " - ชื่อสำนักข่าว" ต่อท้ายพาดหัว ให้ตัดออกเพื่อให้พาดหัวสะอาดอ่านง่าย
    if (publisher && title.endsWith(` - ${publisher}`)) {
      title = title.slice(0, -(` - ${publisher}`.length)).trim();
    } else if (title.includes(" - ")) {
      const parts = title.split(" - ");
      if (parts.length > 1 && parts[parts.length - 1].length < 35) {
        title = parts.slice(0, -1).join(" - ").trim();
      }
    }

    // ถ้ามาจาก Google News (ซึ่ง description เป็นแค่ลิงก์รวมหัวข้อข่าว) ให้ใช้ summary เฉพาะกรณีเป็นเนื้อหาข่าวจริง
    if (url.includes("news.google.com")) {
      summary = "";
    }

    const displaySource = publisher ? `${publisher} (${sourceName})` : sourceName;

    if (title && url.startsWith("http")) {
      items.push({ source_name: displaySource, title, summary, url });
    }
  }
  return items;
}

async function fetchAllNews() {
  console.log("📡 กำลังดึงข่าวจริงล่าสุดจาก RSS สำนักข่าวไทยและต่างประเทศ...");
  const result = {
    education_learning: [],
    thai_politics: [],
    social_movement: [],
    world_news: [],
  };

  for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
    const seen = new Set();
    for (const feed of feeds) {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const xml = await res.text();
        for (const item of parseRssItems(xml, feed.name, 4)) {
          if (!seen.has(item.url)) {
            seen.add(item.url);
            result[category].push(item);
          }
        }
      } catch (err) {
        console.warn(`  [WARN] ดึง RSS ${feed.name} ไม่สำเร็จ: ${err.message}`);
      }
    }
    console.log(`  - หมวด ${category}: ดึงได้ ${result[category].length} ข่าว`);
  }
  return result;
}

function formatCleanSummary(item, defaultText) {
  if (!item || !item.title) return defaultText;
  const rawSummary = (item.summary || "").trim();
  // หาก summary ยาวกว่าพาดหัวและไม่ได้ซ้ำกับพาดหัว ให้ใช้ summary จริงที่ทำความสะอาดแล้ว
  if (rawSummary.length > item.title.length + 15 && !rawSummary.startsWith(item.title)) {
    return rawSummary;
  }
  return `${item.title} — ${defaultText}`;
}

function buildFallbackFromRealNews(newsByCategory, edition) {
  const isMorning = edition === "morning";
  const greeting_message = isMorning
    ? "☀️ สวัสดีตอนเช้าครับทุกคน! จิบกาแฟแล้วมาอัปเดต 4 เรื่องราวสำคัญรอบตัว ทั้งการศึกษาและการเรียนรู้ การเมืองไทย การเคลื่อนไหวทางสังคม และข่าวโลก ผ่านแว่นสังคมวิทยาและการเรียนรู้ไปด้วยกันนะครับ เลื่อนดูการ์ดซ้าย-ขวา แล้วคิดเห็นยังไงพิมพ์คุยกันได้เลย!"
    : "🌇 สวัสดีตอนเย็นครับทุกคน! เหนื่อยกันไหมวันนี้? ก่อนพักผ่อนลองมาทบทวน 4 เหตุการณ์สำคัญของวัน ทั้งเรื่องการศึกษา การเมือง สังคม และโลก ผ่านมุมมองโครงสร้างสังคมและการเรียนรู้กันสักนิดครับ อ่านจบแล้วแวะมาแชร์มุมมองกันได้นะ!";

  const usedUrls = new Set();
  const pickUnique = (list) => {
    for (const item of list || []) {
      if (item.url && !usedUrls.has(item.url)) {
        usedUrls.add(item.url);
        return item;
      }
    }
    return (list && list[0]) || {};
  };

  const ed = pickUnique(newsByCategory.education_learning);
  const tp = pickUnique(newsByCategory.thai_politics);
  const sm = pickUnique(newsByCategory.social_movement);
  const wn = pickUnique(newsByCategory.world_news);

  return {
    greeting_message,
    cards: [
      {
        category_key: "education_learning",
        category_label: "การศึกษาและการเรียนรู้",
        headline:
          ed.title ||
          "โจทย์ใหญ่การศึกษาไทยยุคเปลี่ยนผ่าน: เมื่อห้องเรียนต้องก้าวให้ทันโลกและความเหลื่อมล้ำ",
        what_happened: formatCleanSummary(
          ed,
          "สะท้อนโจทย์สำคัญของการจัดสรรทรัพยากรการเรียนรู้ การสนับสนุนโอกาสทางการศึกษา และการสร้างพื้นที่การเรียนรู้ที่ปลอดภัยและเท่าเทียมสำหรับผู้เรียนทุกคน"
        ),
        social_theory_name:
          "ทฤษฎีทุนทางวัฒนธรรมและการผลิตซ้ำทางสังคม (Cultural Capital - Pierre Bourdieu)",
        social_theory_analysis:
          "ในมุมมองของ Bourdieu โรงเรียนไม่ได้เป็นพื้นที่ที่เป็นกลางเสมอไป แต่เด็กแต่ละคนก้าวเข้าสู่ห้องเรียนด้วย 'ต้นทุนชีวิตและทุนทางวัฒนธรรม' ที่ไม่เท่ากัน หากระบบการศึกษาวัดผลด้วยไม้บรรทัดเดียวโดยไม่โอบรับความหลากหลาย ก็อาจกลายเป็นกลไกที่ผลิตซ้ำความเหลื่อมล้ำเดิมโดยไม่รู้ตัวครับ",
        learning_theory_name:
          "การศึกษาเพื่อการปลดปล่อย vs การศึกษาแบบฝากธนาคาร (Paulo Freire)",
        learning_theory_reflection:
          "Paulo Freire ชวนเราเปลี่ยนจากการเรียนแบบ 'ฝากธนาคาร' (ที่ผู้สอนป้อนข้อมูลฝ่ายเดียว) ไปสู่ 'Problem-Posing Education' หรือการเรียนรู้ผ่านการตั้งคำถามกับโจทย์จริงในชีวิต เพื่อให้ผู้เรียนเป็นเจ้าของการเรียนรู้และค้นพบศักยภาพของตัวเอง",
        reflection_question:
          "ถ้าออกแบบ 'วิชาชีวิต' เพิ่มในโรงเรียนหรือมหาวิทยาลัยได้ 1 วิชา ที่ไม่ต้องสอบแข่งขันแต่ช่วยให้เข้าใจตัวเองและสังคมมากขึ้น คุณอยากให้มีวิชาอะไรที่สุดครับ?",
        source_name: ed.source_name || "Thai PBS (การศึกษา/สังคม)",
        source_url: ed.url || "https://www.thaipbs.or.th/news/social",
      },
      {
        category_key: "thai_politics",
        category_label: "การเมืองไทย",
        headline: tp.title || "พลวัตการเมืองไทยกับการต่อรองพื้นที่ทางนโยบายของประชาชน",
        what_happened: formatCleanSummary(
          tp,
          "ประเด็นทางการเมืองและนโยบายสาธารณะที่กำลังเป็นที่จับตา สะท้อนการตรวจสอบถ่วงดุลและการต่อรองระหว่างกลไกรัฐกับความคาดหวังของประชาชนในสังคม"
        ),
        social_theory_name: "ทฤษฎีอำนาจนำทางวัฒนธรรม (Cultural Hegemony - Antonio Gramsci)",
        social_theory_analysis:
          "การเมืองไม่ใช่แค่เรื่องการโหวตในสภา แต่คือพื้นที่ช่วงชิง 'ความหมาย' ว่าอะไรคือเรื่องเร่งด่วนของสังคม เมื่อฝ่ายการเมืองและภาคประชาชนพยายามนิยามผลประโยชน์สาธารณะใหม่ จึงเกิดการต่อรองทางโครงสร้างอำนาจที่เราเห็นในข่าวนี้ครับ",
        learning_theory_name: "การศึกษาเชิงวิพากษ์ (Critical Pedagogy - Paulo Freire)",
        learning_theory_reflection:
          "การติดตามข่าวนโยบายอย่างเท่าทันช่วยให้พวกเราเปลี่ยนจาก 'ผู้รับผลกระทบเชิงรับ' กลายเป็นพลเมืองที่ตั้งคำถามต่อโครงสร้างงบประมาณและกติกาของรัฐได้อย่างมีวิจารณญาณ",
        reflection_question:
          "คุณคิดว่านโยบายหรือกติกาเรื่องไหนในชีวิตประจำวัน ที่เสียงของคนธรรมดาอย่างเราควรมีส่วนร่วมออกแบบมากกว่านี้?",
        source_name: tp.source_name || "Thai PBS (การเมือง)",
        source_url: tp.url || "https://www.thaipbs.or.th/news/politics",
      },
      {
        category_key: "social_movement",
        category_label: "การเคลื่อนไหวทางสังคม",
        headline: sm.title || "เสียงสะท้อนของคนทำงานและภาคประชาสังคมต่อความมั่นคงในชีวิต",
        what_happened: formatCleanSummary(
          sm,
          "เครือข่ายภาคประชาสังคมและประชาชนออกมาส่งเสียงสะท้อนถึงผลกระทบด้านสิทธิ สวัสดิการ และคุณภาพชีวิต เพื่อเรียกร้องให้เกิดการทบทวนมาตรการคุ้มครองอย่างเป็นธรรม"
        ),
        social_theory_name: "ชนชั้นแรงงานยุคความไม่มั่นคง (The Precariat - Guy Standing)",
        social_theory_analysis:
          "ภายใต้ระบบเศรษฐกิจสมัยใหม่ที่เน้นความยืดหยุ่น คนจำนวนมากกลับต้องแบกรับความเสี่ยงไว้เองโดยไร้ตาข่ายรองรับทางสังคม การรวมตัวกันส่งเสียงจึงเป็นกลไกสำคัญของการขยับเพดานความเป็นธรรมในสังคม",
        learning_theory_name: "การเรียนรู้เพื่อการเปลี่ยนแปลง (Transformative Learning - Jack Mezirow)",
        learning_theory_reflection:
          "เมื่อคนในสังคมเผชิญปัญหาและนำประสบการณ์มาแลกเปลี่ยนกัน จะเกิดการทบทวนกรอบคิดเดิม (Frame of Reference) ว่าปัญหาไม่ได้เกิดจากความผิดพลาดส่วนบุคคลเพียงอย่างเดียว แต่เชื่อมโยงกับโครงสร้างที่แก้ไขร่วมกันได้",
        reflection_question:
          "เวลาเห็นคนกลุ่มเล็กๆ ออกมาเรียกร้องสิทธิ์ในเรื่องที่อาจยังไม่กระทบเราโดยตรง เราได้เรียนรู้อะไรเกี่ยวกับ 'ความเปราะบางร่วมกัน' ของคนในสังคมบ้าง?",
        source_name: sm.source_name || "ประชาไท (Prachatai)",
        source_url: sm.url || "https://prachatai.com",
      },
      {
        category_key: "world_news",
        category_label: "ข่าวสำคัญของโลก",
        headline: wn.title || "ความตึงเครียดระดับโลกกับการปรับตัวของพลเมืองยุคเปลี่ยนผ่าน",
        what_happened: formatCleanSummary(
          wn,
          "สถานการณ์สำคัญในต่างประเทศที่ส่งผลกระทบต่อเนื่องถึงความมั่นคง เศรษฐกิจ ห่วงโซ่อุปทาน และวิถีชีวิตของผู้คนในหลายภูมิภาคทั่วโลกรวมถึงประเทศไทย"
        ),
        social_theory_name: "ทฤษฎีสังคมเสี่ยงภัย (Risk Society - Ulrich Beck)",
        social_theory_analysis:
          "ในโลกยุคโลกาภิวัตน์ ความเสี่ยงจากความขัดแย้ง เศรษฐกิจ หรือสภาพภูมิอากาศไม่ได้จำกัดอยู่แค่ในพรมแดนของประเทศใดประเทศหนึ่งอีกต่อไป แต่กระจายตัวข้ามพรมแดนและส่งผลถึงชีวิตประจำวันของทุกคนอย่างหลีกเลี่ยงไม่ได้",
        learning_theory_name: "การคิดเชิงระบบและพลเมืองโลก (Systems Thinking & Global Citizenship)",
        learning_theory_reflection:
          "ข่าวสารระดับโลกช่วยให้เราฝึกทักษะการมองเห็นความเชื่อมโยง เข้าใจว่าชีวิตของเราผูกพันกับเพื่อนมนุษย์ในซีกโลกอื่นอย่างไร และสร้างความเห็นอกเห็นใจข้ามพรมแดน",
        reflection_question:
          "จากเหตุการณ์โลกวันนี้ คุณคิดว่าทักษะหรือภูมิคุ้มกันทางความคิดเรื่องไหนที่จำเป็นที่สุดสำหรับการอยู่อย่างมีความหวังในยุคที่โลกผันผวน?",
        source_name: wn.source_name || "Thai PBS (ข่าวต่างประเทศ)",
        source_url: wn.url || "https://www.thaipbs.or.th/news/foreign",
      },
    ],
  };
}

async function analyzeWithGeminiOrFallback(newsByCategory, edition) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("ℹ️ ยังไม่ได้ตั้งค่า GEMINI_API_KEY -> สร้างบทวิเคราะห์ตัวอย่างจากข่าวจริงล่าสุด");
    return buildFallbackFromRealNews(newsByCategory, edition);
  }

  console.log("🧠 กำลังวิเคราะห์ข่าวด้วย Gemini API (gemini-3.8-flash)...");
  const editionLabel =
    edition === "morning" ? "รอบเช้า (07:30 น.)" : "รอบเย็น (18:30 น.)";
  const prompt = `คุณคือ "นักสังคมวิทยาและนักการศึกษาเชิงวิพากษ์" ที่เล่าเรื่องด้วยโทนภาษาเข้าใจง่าย อบอุ่นเหมือนเพื่อนคุยกัน
ขณะนี้คือการส่งข่าว ${editionLabel} กรุณาคัดเลือกข่าวเด่นหมวดละ 1 ข่าว รวม 4 ข่าว (เรียงตามลำดับ: education_learning, thai_politics, social_movement, world_news) โดยเน้นประเด็นการศึกษาและการเรียนรู้เป็นพิเศษ จากข้อมูล RSS จริงด้านล่างนี้
ในแต่ละการ์ดต้องมีฟิลด์ครบดังนี้:
- category_key: "education_learning" | "thai_politics" | "social_movement" | "world_news"
- category_label: "การศึกษาและการเรียนรู้" | "การเมืองไทย" | "การเคลื่อนไหวทางสังคม" | "ข่าวสำคัญของโลก"
- headline: พาดหัวข่าวภาษาไทยที่ชวนอ่าน เข้าใจง่าย
- what_happened: สรุปข้อเท็จจริงสำคัญ 3-4 บรรทัด (ภาษาไทยล้วน ห้ามมีโค้ด HTML)
- social_theory_name: ชื่อทฤษฎีสังคมวิทยาหรือรัฐศาสตร์ที่เข้ากับข่าวที่สุด 1-2 ทฤษฎี
- social_theory_analysis: อธิบายปรากฏการณ์เชิงโครงสร้าง อำนาจ หรือพลวัตของกลุ่มคนด้วยภาษาอบอุ่นเข้าใจง่ายเหมือนเพื่อนเล่าให้ฟัง
- learning_theory_name: ชื่อทฤษฎีการเรียนรู้ (เช่น Transformative Learning, Critical Pedagogy, Experiential Learning, Constructivism)
- learning_theory_reflection: อธิบายว่าสังคมหรือผู้เรียนเกิดกระบวนการเรียนรู้อะไรจากเหตุการณ์นี้
- reflection_question: คำถามชวนคิดท้ายข่าว 1 ข้อเพื่อกระตุ้นการถกเถียง
- source_name: ชื่อสำนักข่าวอ้างอิง
- source_url: ลิงก์ข่าวต้นฉบับจริงจากฟิลด์ url ของข่าวนั้นๆ โดยตรง ห้ามแต่ง URL เอง

ตอบกลับเป็น JSON Object ที่มีโครงสร้าง { "greeting_message": "...", "cards": [ ... ] } เท่านั้น:
${JSON.stringify(newsByCategory, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.6 },
    }),
  });
  if (!res.ok) {
    console.warn(`[WARN] Gemini API ตอบกลับ ${res.status} -> ใช้โหมด Fallback`);
    return buildFallbackFromRealNews(newsByCategory, edition);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

const THEMES = {
  education_learning: {
    header_bg: "#4C1D95",
    badge_bg: "#EDE9FE",
    badge_text: "#5B21B6",
    accent: "#7C3AED",
    icon: "📚",
  },
  thai_politics: {
    header_bg: "#1E3A8A",
    badge_bg: "#DBEAFE",
    badge_text: "#1E40AF",
    accent: "#2563EB",
    icon: "🏛️",
  },
  social_movement: {
    header_bg: "#0F766E",
    badge_bg: "#CCFBF1",
    badge_text: "#115E59",
    accent: "#0D9488",
    icon: "✊",
  },
  world_news: {
    header_bg: "#7C2D12",
    badge_bg: "#FFEDD5",
    badge_text: "#9A3412",
    accent: "#EA580C",
    icon: "🌍",
  },
};

function buildBubble(card, edition) {
  const theme = THEMES[card.category_key] || THEMES.thai_politics;
  const editionBadge = edition === "morning" ? "🌅 สรุปข่าวรอบเช้า" : "🌇 สรุปข่าวรอบเย็น";
  const safeUrl =
    card.source_url && card.source_url.startsWith("http")
      ? card.source_url
      : "https://www.thaipbs.or.th/news";

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: theme.header_bg,
      paddingAll: "18px",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          justifyContent: "space-between",
          alignItems: "center",
          contents: [
            {
              type: "box",
              layout: "vertical",
              backgroundColor: theme.badge_bg,
              cornerRadius: "20px",
              paddingStart: "10px",
              paddingEnd: "10px",
              paddingTop: "4px",
              paddingBottom: "4px",
              contents: [
                {
                  type: "text",
                  text: `${theme.icon} ${card.category_label}`,
                  color: theme.badge_text,
                  size: "xs",
                  weight: "bold",
                },
              ],
            },
            {
              type: "text",
              text: editionBadge,
              color: "#E2E8F0",
              size: "xxs",
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: String(card.headline || "").slice(0, 120),
          color: "#FFFFFF",
          size: "md",
          weight: "bold",
          wrap: true,
          margin: "md",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "18px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: "📌 สรุปข้อเท็จจริง (What Happened)",
              weight: "bold",
              size: "sm",
              color: "#1E293B",
            },
            {
              type: "text",
              text: String(card.what_happened || "").slice(0, 500),
              size: "xs",
              color: "#334155",
              wrap: true,
              lineSpacing: "4px",
            },
          ],
        },
        { type: "separator", color: "#E2E8F0" },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: "🔍 มองผ่านแว่นทฤษฎีสังคม",
              weight: "bold",
              size: "sm",
              color: theme.accent,
            },
            {
              type: "text",
              text: `ทฤษฎี: ${card.social_theory_name}`,
              weight: "bold",
              size: "xs",
              color: "#0F172A",
              wrap: true,
            },
            {
              type: "text",
              text: String(card.social_theory_analysis || "").slice(0, 600),
              size: "xs",
              color: "#334155",
              wrap: true,
              lineSpacing: "4px",
            },
          ],
        },
        { type: "separator", color: "#E2E8F0" },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: "💡 เชื่อมโยงทฤษฎีการเรียนรู้",
              weight: "bold",
              size: "sm",
              color: "#047857",
            },
            {
              type: "text",
              text: `แนวคิด: ${card.learning_theory_name}`,
              weight: "bold",
              size: "xs",
              color: "#0F172A",
              wrap: true,
            },
            {
              type: "text",
              text: String(card.learning_theory_reflection || "").slice(0, 600),
              size: "xs",
              color: "#334155",
              wrap: true,
              lineSpacing: "4px",
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FFFBEB",
          cornerRadius: "10px",
          paddingAll: "12px",
          spacing: "xs",
          margin: "md",
          contents: [
            {
              type: "text",
              text: "💬 คำถามชวนคิดวันนี้",
              weight: "bold",
              size: "xs",
              color: "#B45309",
            },
            {
              type: "text",
              text: String(card.reflection_question || "").slice(0, 300),
              size: "xs",
              color: "#78350F",
              wrap: true,
              lineSpacing: "4px",
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "14px",
      spacing: "sm",
      backgroundColor: "#F8FAFC",
      contents: [
        {
          type: "text",
          text: `📰 แหล่งอ้างอิง: ${card.source_name}`,
          size: "xxs",
          color: "#64748B",
          wrap: true,
        },
        {
          type: "button",
          style: "primary",
          color: theme.accent,
          height: "sm",
          action: {
            type: "uri",
            label: "🔗 อ่านข่าวต้นฉบับ",
            uri: safeUrl,
          },
        },
      ],
    },
  };
}

function writeHtmlPreview(digest, edition) {
  const editionBadge = edition === "morning" ? "🌅 สรุปข่าวรอบเช้า" : "🌇 สรุปข่าวรอบเย็น";
  const cardsHtml = digest.cards
    .map((card) => {
      const theme = THEMES[card.category_key] || THEMES.thai_politics;
      return `
      <div class="bubble">
        <div class="bubble-header" style="background:${theme.header_bg};">
          <div class="header-top">
            <span class="cat-badge" style="background:${theme.badge_bg};color:${theme.badge_text};">${theme.icon} ${escapeHtml(card.category_label)}</span>
            <span class="edition-badge">${editionBadge}</span>
          </div>
          <div class="headline">${escapeHtml(card.headline)}</div>
        </div>
        <div class="bubble-body">
          <div class="section">
            <div class="sec-title">📌 สรุปข้อเท็จจริง (What Happened)</div>
            <div class="sec-text">${escapeHtml(card.what_happened)}</div>
          </div>
          <hr/>
          <div class="section">
            <div class="sec-title" style="color:${theme.accent};">🔍 มองผ่านแว่นทฤษฎีสังคม</div>
            <div class="sec-sub">ทฤษฎี: ${escapeHtml(card.social_theory_name)}</div>
            <div class="sec-text">${escapeHtml(card.social_theory_analysis)}</div>
          </div>
          <hr/>
          <div class="section">
            <div class="sec-title" style="color:#047857;">💡 เชื่อมโยงทฤษฎีการเรียนรู้</div>
            <div class="sec-sub">แนวคิด: ${escapeHtml(card.learning_theory_name)}</div>
            <div class="sec-text">${escapeHtml(card.learning_theory_reflection)}</div>
          </div>
          <div class="question-box">
            <div class="q-title">💬 คำถามชวนคิดวันนี้</div>
            <div class="q-text">${escapeHtml(card.reflection_question)}</div>
          </div>
        </div>
        <div class="bubble-footer">
          <div class="source-label">📰 แหล่งอ้างอิง: ${escapeHtml(card.source_name)}</div>
          <a class="read-btn" style="background:${theme.accent};" href="${escapeHtml(card.source_url)}" target="_blank" rel="noopener noreferrer">🔗 อ่านข่าวต้นฉบับ</a>
        </div>
      </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ตัวอย่าง LINE OA Flex Message Carousel - สรุปข่าวสังคมวิทยา & การเรียนรู้</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Sarabun', sans-serif; background: #849EB8; margin: 0; padding: 24px; color: #1E293B; }
  .chat-container { max-width: 1120px; margin: 0 auto; }
  .chat-title { color: #fff; text-align: center; margin-bottom: 16px; text-shadow: 0 1px 3px rgba(0,0,0,0.25); }
  .greeting-bubble { background: #FFFFFF; border-radius: 16px; padding: 14px 18px; max-width: 640px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.12); line-height: 1.6; font-size: 15px; }
  .carousel { display: flex; gap: 18px; overflow-x: auto; padding-bottom: 16px; }
  .bubble { background: #FFFFFF; border-radius: 18px; width: 345px; min-width: 345px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.16); }
  .bubble-header { padding: 18px; color: #fff; }
  .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .cat-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .edition-badge { font-size: 11px; color: #E2E8F0; }
  .headline { font-size: 16px; font-weight: 700; line-height: 1.4; }
  .bubble-body { padding: 18px; flex: 1; }
  .section { margin-bottom: 10px; }
  .sec-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
  .sec-sub { font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 4px; }
  .sec-text { font-size: 13px; color: #334155; line-height: 1.55; }
  hr { border: none; border-top: 1px solid #E2E8F0; margin: 12px 0; }
  .question-box { background: #FFFBEB; border-radius: 10px; padding: 12px; margin-top: 12px; }
  .q-title { font-weight: 700; font-size: 13px; color: #B45309; margin-bottom: 4px; }
  .q-text { font-size: 13px; color: #78350F; line-height: 1.5; }
  .bubble-footer { background: #F8FAFC; padding: 14px 18px; border-top: 1px solid #E2E8F0; }
  .source-label { font-size: 12px; color: #64748B; margin-bottom: 8px; }
  .read-btn { display: block; text-align: center; color: #FFFFFF; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: 700; font-size: 14px; }
</style>
</head>
<body>
  <div class="chat-container">
    <h2 class="chat-title">📱 ตัวอย่างการแสดงผลในแชท LINE Official Account (Flex Carousel)</h2>
    <div class="greeting-bubble">${escapeHtml(digest.greeting_message)}</div>
    <div class="carousel">${cardsHtml}</div>
  </div>
</body>
</html>`;
  fs.writeFileSync("preview_flex.html", html, "utf-8");
}

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const roundIdx = args.indexOf("--round");
  const roundArg = roundIdx >= 0 ? args[roundIdx + 1] : "auto";
  // คำนวณเวลาประเทศไทย (UTC+7) หากเลือก auto
  const nowThHour = (new Date().getUTCHours() + 7) % 24;
  const edition =
    roundArg === "morning" || roundArg === "evening"
      ? roundArg
      : nowThHour < 14
        ? "morning"
        : "evening";

  const newsByCategory = await fetchAllNews();
  const digest = await analyzeWithGeminiOrFallback(newsByCategory, edition);

  const flexPayload = {
    type: "flex",
    altText: "📰 สรุปข่าวการเมือง สังคม และโลก ผ่านแว่นสังคมวิทยาและการเรียนรู้",
    contents: {
      type: "carousel",
      contents: digest.cards.map((c) => buildBubble(c, edition)),
    },
  };

  fs.writeFileSync("latest_flex_payload.json", JSON.stringify(flexPayload, null, 2), "utf-8");
  writeHtmlPreview(digest, edition);
  console.log("✅ อัปเดตไฟล์ preview_flex.html และ latest_flex_payload.json ด้วยข่าวจริงล่าสุดเรียบร้อยแล้ว!");

  if (isDryRun) {
    console.log("🧪 [โหมดทดสอบ --dry-run] ข้ามขั้นตอนการส่งเข้า LINE OA");
    return;
  }

  const lineToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  if (!lineToken || lineToken === "your_line_channel_access_token_here") {
    throw new Error("กรุณาใส่ LINE_CHANNEL_ACCESS_TOKEN ในไฟล์ .env ก่อนส่งเข้า LINE OA จริง");
  }

  const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      messages: [{ type: "text", text: digest.greeting_message }, flexPayload],
    }),
  });
  if (!res.ok) {
    throw new Error(`ส่งเข้า LINE OA ไม่สำเร็จ (${res.status}): ${await res.text()}`);
  }
  console.log("🎉 ส่งการ์ดข่าวเข้า LINE Official Account สำเร็จเรียบร้อย!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
