/**
 * สคริปต์รันระบบดึงข่าวจริง + วิเคราะห์ด้วย Gemini (นักสังคมวิทยา & นักการศึกษาเชิงวิพากษ์)
 * + ระบบป้องกันข่าวซ้ำและหมุนเวียนทฤษฎี (Smart History & Theory Rotation)
 * + สร้างการ์ด LINE Flex Message Carousel พร้อมปุ่ม Direct Instruction เจาะลึกทฤษฎี
 * + สร้างเว็บไซต์คลังความรู้ย้อนหลังอัตโนมัติ (GitHub Pages Knowledge Archive ในโฟลเดอร์ docs/)
 *
 * วิธีรันทดสอบ:
 *   node run_local.mjs --round morning --dry-run
 * วิธีรันส่งเข้า LINE OA จริง:
 *   node run_local.mjs --round morning
 */

import fs from "node:fs";
import path from "node:path";

const GITHUB_PAGES_BASE_URL = "https://napatsakorndel-afk.github.io/line-oa-news/";
const HISTORY_FILE = "sent_history.json";
const ARCHIVE_DIR = "docs";
const ARCHIVE_JSON_FILE = path.join(ARCHIVE_DIR, "archive_data.json");
const ARCHIVE_HTML_FILE = path.join(ARCHIVE_DIR, "index.html");

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

// ============================================================================
// 1. ระบบความจำป้องกันข่าวซ้ำ & หมุนเวียนทฤษฎีการเรียนรู้ (Smart History & Rotation)
// ============================================================================
const LEARNING_THEORY_POOL = [
  {
    id: "direct_instruction",
    title: "Visible Learning & Direct Instruction (John Hattie & Gregory Yates)",
    core_idea:
      "ผู้เรียนมักถูกคาดหวังให้แก้ปัญหาซับซ้อนโดยยังไม่ได้รับการฝึกทักษะพื้นฐาน การสอนแบบมีโครงสร้างชัดเจน (Explicit Teaching) ช่วยลดภาระสมองจากการลองผิดลองถูกและจัดระเบียบความรู้ที่ซับซ้อนได้แม่นยำ",
  },
  {
    id: "interest_4_phases",
    title: "ทฤษฎีการพัฒนาความสนใจ 4 ระยะ (Four-Phase Model of Interest Development)",
    core_idea:
      "การบ่มเพาะความสนใจจาก Triggered situational interest (จุดประกายชั่วคราว) -> Maintained situational interest (รักษาความสนใจระยะสั้น) -> Emerging individual interest -> Well-developed individual interest (ความสนใจส่วนบุคคลที่ยั่งยืน)",
  },
  {
    id: "piaget_constructivism",
    title: "Cognitive Constructivism & Schema (Jean Piaget)",
    core_idea:
      "มนุษย์สร้างความรู้ด้วยตนเองผ่านประสบการณ์ โดยเชื่อมโยงข้อมูลใหม่เข้ากับความรู้เดิม (Prior Knowledge) เพื่อปรับขยายโครงสร้างทางปัญญา (Schema) ให้ซับซ้อนขึ้น",
  },
  {
    id: "vygotsky_scaffolding",
    title: "Social Constructivism, ZPD & Scaffolding (Lev Vygotsky)",
    core_idea:
      "การเรียนรู้เกิดจากปฏิสัมพันธ์ทางสังคมและการลงมือทำในชีวิตจริง โดยมีนั่งร้านทางปัญญา (Scaffolding) ช่วยพยุงให้ก้าวข้ามขีดจำกัดเดิม (ZPD) เชื่อมโยงนอกห้องเรียนกับในห้องเรียน",
  },
  {
    id: "concrete_to_abstract",
    title: "การสร้างความรู้จากรูปธรรมสู่นามธรรม (Building from Concrete to Abstract Knowledge)",
    core_idea:
      "เริ่มต้นจากตัวอย่างหรือประสบการณ์รูปธรรมที่จับต้องได้ใกล้ตัว (Concrete) แล้วค่อยๆ เชื่อมโยงไปสู่หลักการหรือโครงสร้างเชิงนามธรรม (Abstract)",
  },
  {
    id: "novice_to_expert",
    title: "Novice to Expert Performance & Using Prior Knowledge",
    core_idea:
      "กระบวนการเปลี่ยนผ่านจากผู้เริ่มต้น (Novice) ที่มองเห็นแต่ข้อเท็จจริงแยกส่วน ไปสู่ผู้เชี่ยวชาญ (Expert) ที่เชื่อมโยงรูปแบบและโครงสร้างใหญ่ได้โดยต่อยอดจากความรู้เดิม",
  },
  {
    id: "externalization_reflection",
    title: "Experiential Learning, Reflection & Externalization/Articulation",
    core_idea:
      "การเรียนรู้ผ่านประสบการณ์ตรงจะสมบูรณ์เมื่อได้คิดใคร่ครวญทบทวน (Reflection) และถ่ายทอดเรียบเรียงความคิดภายในออกมาเป็นคำพูดหรือการกระทำ (Externalization & Articulation)",
  },
  {
    id: "connectivism_ecological",
    title: "Connectivism & Ecological Systems Theory (Bronfenbrenner)",
    core_idea:
      "การเรียนรู้เกิดขึ้นท่ามกลางการไหลเวียนของข้อมูลในเครือข่ายดิจิทัล (Connectivism) และได้รับอิทธิพลจากบริบทสภาพแวดล้อมหลายระดับชั้นรอบตัวมนุษย์ (Ecological Systems)",
  },
  {
    id: "behaviorism_perception_memory",
    title: "Behaviorism, Perception & Memory (Stimulus/Reinforcement & Encoding/Retrieval)",
    core_idea:
      "การเรียนรู้ผ่านสิ่งเร้าและการเสริมแรงทางสังคม (Behaviorism), การเลือกรับรู้และตีความผ่านความรู้เดิม (Perception), และการจัดเก็บ/ดึงบทเรียนจากความทรงจำมาใช้ (Memory)",
  },
];

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return { used_urls: [], used_titles: [], last_theory_ids: [], run_count: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return { used_urls: [], used_titles: [], last_theory_ids: [], run_count: 0 };
  }
}

function saveHistory(history) {
  const trimmed = {
    used_urls: (history.used_urls || []).slice(-80),
    used_titles: (history.used_titles || []).slice(-80),
    last_theory_ids: (history.last_theory_ids || []).slice(-4),
    run_count: (history.run_count || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

function selectRotatedTheories(history) {
  const lastIds = new Set(history.last_theory_ids || []);
  const fresh = LEARNING_THEORY_POOL.filter((t) => !lastIds.has(t.id));
  const picked = fresh.slice(0, 4);
  while (picked.length < 4) {
    picked.push(LEARNING_THEORY_POOL[picked.length % LEARNING_THEORY_POOL.length]);
  }
  return picked;
}

// ============================================================================
// 2. ดึงข่าว RSS และกรองข่าวที่เคยส่งไปแล้วออก (Deduplication)
// ============================================================================
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
    {
      name: "ข่าวการเมืองไทย",
      url: "https://news.google.com/rss/search?q=%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%87%E0%B9%84%E0%B8%97%E0%B8%A2+OR+%E0%B8%AA%E0%B8%A0%E0%B8%B2%E0%B8%9C%E0%B8%B9%E0%B9%89%E0%B9%81%E0%B8%97%E0%B8%99+OR+%E0%B8%99%E0%B9%82%E0%B8%A2%E0%B8%9A%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%90%E0%B8%9A%E0%B8%B2%E0%B8%A5&hl=th&gl=TH&ceid=TH:th",
    },
  ],
  social_movement: [
    { name: "ประชาไท (สิทธิมนุษยชน/สังคม)", url: "https://prachatai.com/rss.xml" },
    { name: "BBC News ไทย", url: "https://feeds.bbci.co.uk/thai/rss.xml" },
    {
      name: "ข่าวสังคมและสิทธิมนุษยชน",
      url: "https://news.google.com/rss/search?q=%E0%B8%A0%E0%B8%B2%E0%B8%84%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%8A%E0%B8%B2%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1+OR+%E0%B8%AA%E0%B8%B4%E0%B8%97%E0%B8%98%E0%B8%B4%E0%B8%A1%E0%B8%99%E0%B8%B8%E0%B8%A9%E0%B8%A2%E0%B8%8A%E0%B8%99+OR+%E0%B9%81%E0%B8%A3%E0%B8%87%E0%B8%87%E0%B8%B2%E0%B8%99+OR+%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3&hl=th&gl=TH&ceid=TH:th",
    },
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
  let s = String(str).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = decodeEntities(decodeEntities(s));
  s = s.replace(/<[^>]+>/g, " ");
  return s.replace(/\s+/g, " ").trim().slice(0, 420);
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseRssItems(xml, sourceName, maxItems = 6) {
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

    if (publisher && title.endsWith(` - ${publisher}`)) {
      title = title.slice(0, -(` - ${publisher}`.length)).trim();
    } else if (title.includes(" - ")) {
      const parts = title.split(" - ");
      if (parts.length > 1 && parts[parts.length - 1].length < 35) {
        title = parts.slice(0, -1).join(" - ").trim();
      }
    }

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

async function fetchAllNews(history) {
  console.log("📡 กำลังดึงข่าวจริงล่าสุดจาก RSS และตรวจสอบข่าวซ้ำกับรอบก่อนหน้า...");
  const usedUrls = new Set(history.used_urls || []);
  const usedTitles = new Set(history.used_titles || []);

  const result = {
    education_learning: [],
    thai_politics: [],
    social_movement: [],
    world_news: [],
  };

  for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
    const seen = new Set();
    const freshItems = [];
    const allItems = [];

    for (const feed of feeds) {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const xml = await res.text();
        for (const item of parseRssItems(xml, feed.name, 6)) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
          allItems.push(item);
          if (!usedUrls.has(item.url) && !usedTitles.has(item.title)) {
            freshItems.push(item);
          }
        }
      } catch (err) {
        console.warn(`  [WARN] ดึง RSS ${feed.name} ไม่สำเร็จ: ${err.message}`);
      }
    }
    result[category] = freshItems.length >= 2 ? freshItems : allItems;
    console.log(
      `  - หมวด ${category}: ข่าวใหม่ไม่ซ้ำ ${freshItems.length} ข่าว (ทั้งหมด ${allItems.length})`
    );
  }
  return result;
}

function formatCleanSummary(item, defaultText) {
  if (!item || !item.title) return defaultText;
  const rawSummary = (item.summary || "").trim();
  if (rawSummary.length > item.title.length + 15 && !rawSummary.startsWith(item.title)) {
    return rawSummary;
  }
  return `${item.title} — ${defaultText}`;
}

function buildFallbackFromRealNews(newsByCategory, edition, rotatedTheories) {
  const isMorning = edition === "morning";
  const greeting_message = isMorning
    ? "☀️ สวัสดีตอนเช้าครับทุกคน! จิบกาแฟแล้วมาอัปเดต 4 เรื่องราวสำคัญรอบตัว ทั้งการศึกษา การเมืองไทย การเคลื่อนไหวทางสังคม และข่าวโลก ผ่านแว่นสังคมวิทยาและทฤษฎีการเรียนรู้ไปด้วยกันนะครับ กดปุ่ม '🎓 เจาะลึกทฤษฎี' ท้ายการ์ดเพื่ออ่านสรุปเข้าใจไวใน 1 นาทีได้เลย!"
    : "🌇 สวัสดีตอนเย็นครับทุกคน! เหนื่อยกันไหมวันนี้? ก่อนพักผ่อนลองมาทบทวน 4 เหตุการณ์สำคัญของวัน ผ่านมุมมองโครงสร้างสังคมและทฤษฎีการเรียนรู้ที่หมุนเวียนมาฝากกันไม่ซ้ำรอบนะครับ!";

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
        learning_theory_name: rotatedTheories[0].title,
        learning_theory_reflection: rotatedTheories[0].core_idea,
        direct_instruction_steps:
          "1) แนวคิดหลัก: ชี้เป้าชัดเจนไม่ปล่อยให้ผู้เรียนลองผิดลองถูกอย่างไร้ทิศทาง | 2) ตัวอย่างในข่าว: การจัดโครงสร้างสื่อและสภาพแวดล้อมที่ช่วยลดภาระสมอง | 3) นำไปใช้จริง: เริ่มจากสอนพื้นฐานให้แม่นยำก่อนให้โจทย์ซับซ้อน",
        reflection_question:
          "ถ้าออกแบบ 'วิชาชีวิต' เพิ่มในโรงเรียนหรือมหาวิทยาลัยได้ 1 วิชา ที่ไม่ต้องสอบแข่งขันแต่ช่วยให้เข้าใจตัวเองและสังคมมากขึ้น คุณอยากให้มีวิชาอะไรที่สุดครับ?",
        source_name: ed.source_name || "ข่าวการศึกษาและการเรียนรู้",
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
        learning_theory_name: rotatedTheories[1].title,
        learning_theory_reflection: rotatedTheories[1].core_idea,
        direct_instruction_steps:
          "1) แนวคิดหลัก: มนุษย์ปรับโครงสร้างความรู้ (Schema) จากประสบการณ์ | 2) ตัวอย่างในข่าว: การเห็นผลกระทบของนโยบายใกล้ตัวทำให้เข้าใจโครงสร้างรัฐ | 3) นำไปใช้จริง: เชื่อมโยงข่าวรายวันเข้ากับความรู้เดิมเพื่อมองเห็นภาพใหญ่",
        reflection_question:
          "คุณคิดว่านโยบายหรือกติกาเรื่องไหนในชีวิตประจำวัน ที่เสียงของคนธรรมดาอย่างเราควรมีส่วนร่วมออกแบบมากกว่านี้?",
        source_name: tp.source_name || "BBC News ไทย",
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
        learning_theory_name: rotatedTheories[2].title,
        learning_theory_reflection: rotatedTheories[2].core_idea,
        direct_instruction_steps:
          "1) แนวคิดหลัก: การเรียนรู้เกิดจากปฏิสัมพันธ์ทางสังคมและการชี้แนะ (Scaffolding) | 2) ตัวอย่างในข่าว: เครือข่ายประชาชนช่วยกันแลกเปลี่ยนความรู้และพยุงกัน | 3) นำไปใช้จริง: สร้างพื้นที่แลกเปลี่ยนเรียนรู้ร่วมกับคนรอบข้าง",
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
        learning_theory_name: rotatedTheories[3].title,
        learning_theory_reflection: rotatedTheories[3].core_idea,
        direct_instruction_steps:
          "1) แนวคิดหลัก: เริ่มจากสิ่งที่เป็นรูปธรรมใกล้ตัว (Concrete) สู่หลักการนามธรรม (Abstract) | 2) ตัวอย่างในข่าว: ราคาสินค้าและพลังงานในบ้านเราเชื่อมโยงกับภูมิรัฐศาสตร์โลก | 3) นำไปใช้จริง: ฝึกมองความเชื่อมโยงจากเรื่องใกล้ตัวสู่นโยบายระดับโลก",
        reflection_question:
          "จากเหตุการณ์โลกวันนี้ คุณคิดว่าทักษะหรือภูมิคุ้มกันทางความคิดเรื่องไหนที่จำเป็นที่สุดสำหรับการอยู่อย่างมีความหวังในยุคที่โลกผันผวน?",
        source_name: wn.source_name || "ข่าวต่างประเทศ",
        source_url: wn.url || "https://www.thaipbs.or.th/news/foreign",
      },
    ],
  };
}

async function analyzeWithGeminiOrFallback(newsByCategory, edition, rotatedTheories) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("ℹ️ ยังไม่ได้ตั้งค่า GEMINI_API_KEY -> สร้างบทวิเคราะห์ตัวอย่างจากข่าวจริงล่าสุด");
    return buildFallbackFromRealNews(newsByCategory, edition, rotatedTheories);
  }

  console.log("🧠 กำลังวิเคราะห์ข่าวด้วย Gemini API พร้อมหมุนเวียนทฤษฎีการเรียนรู้ไม่ให้ซ้ำรอบก่อน...");
  const editionLabel =
    edition === "morning" ? "รอบเช้า (07:30 น.)" : "รอบเย็น (18:30 น.)";

  const assignedTheoriesText = rotatedTheories
    .map((t, idx) => `การ์ดใบที่ ${idx + 1}: ต้องใช้ทฤษฎีการเรียนรู้ "${t.title}" (${t.core_idea})`)
    .join("\n");

  const prompt = `คุณคือ "นักสังคมวิทยาและนักการศึกษาเชิงวิพากษ์" ที่เล่าเรื่องด้วยโทนภาษาเข้าใจง่าย อบอุ่นเหมือนเพื่อนคุยกัน
ขณะนี้คือการส่งข่าว ${editionLabel} กรุณาคัดเลือกข่าวเด่นหมวดละ 1 ข่าว รวม 4 ข่าวที่ไม่ซ้ำกันเลย (เรียงตามลำดับ: education_learning, thai_politics, social_movement, world_news) จากข้อมูล RSS จริงด้านล่างนี้

ข้อบังคับการหมุนเวียนทฤษฎีการเรียนรู้ประจำรอบนี้ (เพื่อไม่ให้ซ้ำกับรอบก่อนหน้า):
${assignedTheoriesText}

ในแต่ละการ์ดต้องมีฟิลด์ครบดังนี้:
- category_key: "education_learning" | "thai_politics" | "social_movement" | "world_news"
- category_label: "การศึกษาและการเรียนรู้" | "การเมืองไทย" | "การเคลื่อนไหวทางสังคม" | "ข่าวสำคัญของโลก"
- headline: พาดหัวข่าวภาษาไทยที่ชวนอ่าน เข้าใจง่าย
- what_happened: สรุปข้อเท็จจริงสำคัญ 3-4 บรรทัด (ภาษาไทยล้วน ห้ามมีโค้ด HTML)
- social_theory_name: ชื่อทฤษฎีสังคมวิทยาหรือรัฐศาสตร์ที่เข้ากับข่าวที่สุด 1-2 ทฤษฎี
- social_theory_analysis: อธิบายปรากฏการณ์เชิงโครงสร้าง อำนาจ หรือพลวัตของกลุ่มคนด้วยภาษาอบอุ่นเข้าใจง่ายเหมือนเพื่อนเล่าให้ฟัง
- learning_theory_name: ชื่อทฤษฎีการเรียนรู้ตามที่กำหนดให้ในการ์ดใบนั้นๆ
- learning_theory_reflection: อธิบายเชื่อมโยงเหตุการณ์ในข่าวเข้ากับทฤษฎีการเรียนรู้ที่ได้รับมอบหมายอย่างเห็นภาพชัดเจน
- direct_instruction_steps: สรุปแก่นของทฤษฎีการเรียนรู้นี้แบบ Direct Instruction 3 ขั้นตอนสั้นๆ (1. แนวคิดหลักคืออะไร 2. เห็นได้จากข่าวนี้ตรงไหน 3. เอาไปใช้ในชีวิตจริงอย่างไร) ความยาวไม่เกิน 240 ตัวอักษร
- reflection_question: คำถามชวนคิดท้ายข่าว 1 ข้อ เพื่อกระตุ้นให้ผู้อ่านเกิดกระบวนการ Reflection, Articulation และยกระดับความสนใจจาก Situational interest ไปสู่ Individual interest
- source_name: ชื่อสำนักข่าวอ้างอิง
- source_url: ลิงก์ข่าวต้นฉบับจริงจากฟิลด์ url ของข่าวนั้นๆ โดยตรง ห้ามแต่ง URL เอง

ตอบกลับเป็น JSON Object ที่มีโครงสร้าง { "greeting_message": "...", "cards": [ ... ] } เท่านั้น:
${JSON.stringify(newsByCategory, null, 2)}`;

  const modelsToTry = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.6 },
        }),
      });
      if (!res.ok) {
        console.warn(`  [WARN] โมเดล ${modelName} ตอบกลับ ${res.status} -> ลองโมเดลถัดไป...`);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`  ✅ วิเคราะห์สำเร็จด้วยโมเดล ${modelName}`);
        return JSON.parse(text);
      }
    } catch (err) {
      console.warn(`  [WARN] โมเดล ${modelName} ขัดข้อง: ${err.message}`);
    }
  }

  console.warn("[WARN] ทุกโมเดลติดภาระงานหนักชั่วคราว -> ใช้โหมด Fallback");
  return buildFallbackFromRealNews(newsByCategory, edition, rotatedTheories);
}

// ============================================================================
// 3. สร้างการ์ด LINE Flex Carousel พร้อมปุ่ม Direct Instruction & คลังความรู้
// ============================================================================
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

function buildBubble(card, edition, cardId) {
  const theme = THEMES[card.category_key] || THEMES.thai_politics;
  const editionBadge = edition === "morning" ? "🌅 สรุปข่าวรอบเช้า" : "🌇 สรุปข่าวรอบเย็น";
  const safeUrl =
    card.source_url && card.source_url.startsWith("http")
      ? card.source_url
      : "https://www.thaipbs.or.th/news";
  const archiveLessonUrl = `${GITHUB_PAGES_BASE_URL}theories.html`;

  const directInstructionText = String(
    card.direct_instruction_steps ||
      "1) แนวคิดหลักชัดเจน | 2) เชื่อมโยงตัวอย่างจริงในข่าว | 3) นำไปสังเกตและปรับใช้ในชีวิตประจำวัน"
  ).slice(0, 280);

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
              text: String(card.what_happened || "").slice(0, 480),
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
              text: String(card.social_theory_analysis || "").slice(0, 550),
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
              text: String(card.learning_theory_reflection || "").slice(0, 550),
              size: "xs",
              color: "#334155",
              wrap: true,
              lineSpacing: "4px",
            },
          ],
        },
        // กล่องสรุป Direct Instruction 3 ขั้นตอน
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F0FDF4",
          cornerRadius: "10px",
          paddingAll: "11px",
          spacing: "xs",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: "🎓 สรุปทฤษฎีเข้าใจไว (Direct Instruction)",
              weight: "bold",
              size: "xs",
              color: "#166534",
            },
            {
              type: "text",
              text: directInstructionText,
              size: "xxs",
              color: "#14532D",
              wrap: true,
              lineSpacing: "4px",
            },
          ],
        },
        // กล่องคำถามชวนคิด
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FFFBEB",
          cornerRadius: "10px",
          paddingAll: "12px",
          spacing: "xs",
          margin: "sm",
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
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "uri",
            label: "🎓 อินโฟกราฟิกทฤษฎี",
            uri: archiveLessonUrl,
          },
        },
      ],
    },
  };
}

// ============================================================================
// 4. สร้างเว็บไซต์คลังความรู้ย้อนหลังอัตโนมัติ (GitHub Pages Knowledge Archive)
// ============================================================================
function buildKnowledgeHubBubble() {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#311068",
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
              backgroundColor: "#FEF3C7",
              cornerRadius: "20px",
              paddingStart: "10px",
              paddingEnd: "10px",
              paddingTop: "4px",
              paddingBottom: "4px",
              contents: [
                {
                  type: "text",
                  text: "🎓 KNOWLEDGE HUB",
                  color: "#B45309",
                  size: "xs",
                  weight: "bold",
                },
              ],
            },
            {
              type: "text",
              text: "📊 อินโฟกราฟิกเจาะลึก",
              color: "#E2E8F0",
              size: "xxs",
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: "คลังสรุปทฤษฎีการเรียนรู้ & แว่นสังคมวิทยาเชิงวิพากษ์",
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
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: "เลือกกดหัวข้อทฤษฎีด้านล่างเพื่อเปิดอ่านสรุปแบบเจาะลึกพร้อมภาพอินโฟกราฟิกเปรียบเทียบได้เลยครับ:",
          size: "xs",
          color: "#334155",
          wrap: true,
          margin: "none",
        },
        {
          type: "button",
          style: "primary",
          color: "#4C1D95",
          height: "sm",
          margin: "md",
          action: {
            type: "uri",
            label: "🎓 เปิดคลังอินโฟกราฟิก",
            uri: `${GITHUB_PAGES_BASE_URL}theories.html`,
          },
        },
        {
          type: "button",
          style: "primary",
          color: "#1E3A8A",
          height: "sm",
          margin: "sm",
          action: {
            type: "uri",
            label: "📰 ค้นหาข่าวย้อนหลัง",
            uri: `${GITHUB_PAGES_BASE_URL}index.html`,
          },
        },
        { type: "separator", margin: "md", color: "#E2E8F0" },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          margin: "md",
          action: {
            type: "uri",
            label: "🎯 Direct Instruction",
            uri: `${GITHUB_PAGES_BASE_URL}theories.html#direct_instruction`,
          },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          margin: "sm",
          action: {
            type: "uri",
            label: "🪜 ความสนใจ 4 ระยะ",
            uri: `${GITHUB_PAGES_BASE_URL}theories.html#interest_4_phases`,
          },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          margin: "sm",
          action: {
            type: "uri",
            label: "🧠 Piaget & Vygotsky",
            uri: `${GITHUB_PAGES_BASE_URL}theories.html#constructivism`,
          },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          margin: "sm",
          action: {
            type: "uri",
            label: "🎨 ตาราง 8 มิติเรียนรู้",
            uri: `${GITHUB_PAGES_BASE_URL}theories.html#concrete_to_abstract`,
          },
        },
      ],
    },
  };
}

function updateKnowledgeArchive(digest, edition) {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  let archiveEntries = [];
  if (fs.existsSync(ARCHIVE_JSON_FILE)) {
    try {
      archiveEntries = JSON.parse(fs.readFileSync(ARCHIVE_JSON_FILE, "utf-8"));
    } catch {
      archiveEntries = [];
    }
  }

  const nowIso = new Date().toISOString();
  const dateLabel = new Date(Date.now() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const timestampSlug = Date.now();

  const newCardsWithIds = (digest.cards || []).map((c, idx) => {
    const cardId = `card-${timestampSlug}-${idx + 1}`;
    return {
      ...c,
      card_id: cardId,
      edition,
      date_label: dateLabel,
      created_at: nowIso,
    };
  });

  // วางการ์ดชุดใหม่ไว้บนสุด และเก็บย้อนหลังสูงสุด 200 การ์ด
  const existingUrls = new Set(newCardsWithIds.map((c) => c.source_url));
  const filteredOld = archiveEntries.filter((old) => !existingUrls.has(old.source_url));
  const updatedArchive = [...newCardsWithIds, ...filteredOld].slice(0, 200);

  fs.writeFileSync(ARCHIVE_JSON_FILE, JSON.stringify(updatedArchive, null, 2), "utf-8");

  const archiveHtml = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>คลังความรู้ข่าวสังคมวิทยา & ทฤษฎีการเรียนรู้ (Knowledge Archive)</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #F1F5F9;
    --card-bg: #FFFFFF;
    --text: #0F172A;
    --muted: #475569;
    --primary: #4C1D95;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Sarabun', sans-serif;
    background: var(--bg);
    color: var(--text);
    margin: 0;
    padding: 0;
  }
  .top-nav {
    background: #1E1B4B;
    padding: 12px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.18);
  }
  .nav-btn {
    color: #E0E7FF;
    text-decoration: none;
    padding: 9px 18px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
    transition: all 0.2s;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .nav-btn:hover { background: rgba(255,255,255,0.12); }
  .nav-btn.active {
    background: #F59E0B;
    color: #1E1B4B;
    border-color: #F59E0B;
  }
  header {
    background: linear-gradient(135deg, #311068 0%, #1E3A8A 60%, #0F766E 100%);
    color: #fff;
    padding: 36px 20px 28px;
    text-align: center;
  }
  header h1 { margin: 0 0 8px; font-size: 26px; }
  header p { margin: 0 auto; max-width: 720px; color: #E2E8F0; font-size: 15px; line-height: 1.6; }
  .container { max-width: 1180px; margin: 0 auto; padding: 24px 16px 60px; }
  .controls {
    background: #fff;
    padding: 16px;
    border-radius: 16px;
    box-shadow: 0 4px 14px rgba(15,23,42,0.06);
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .search-input {
    flex: 1;
    min-width: 240px;
    padding: 11px 16px;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    font-family: inherit;
    font-size: 15px;
  }
  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pill {
    border: 1px solid #CBD5E1;
    background: #F8FAFC;
    color: #334155;
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .pill.active {
    background: #4C1D95;
    color: #fff;
    border-color: #4C1D95;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(335px, 1fr));
    gap: 20px;
  }
  .bubble {
    background: #FFFFFF;
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(15,23,42,0.09);
    transition: transform 0.15s ease;
  }
  .bubble:target {
    outline: 4px solid #F59E0B;
    transform: scale(1.01);
  }
  .bubble-header { padding: 18px; color: #fff; }
  .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .cat-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .edition-badge { font-size: 11px; color: #E2E8F0; }
  .headline { font-size: 16px; font-weight: 700; line-height: 1.4; }
  .bubble-body { padding: 18px; flex: 1; }
  .section { margin-bottom: 10px; }
  .sec-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
  .sec-sub { font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 4px; }
  .sec-text { font-size: 13.5px; color: #334155; line-height: 1.58; }
  hr { border: none; border-top: 1px solid #E2E8F0; margin: 12px 0; }
  .di-box {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 10px;
    padding: 12px;
    margin-top: 12px;
  }
  .di-title { font-weight: 700; font-size: 13px; color: #166534; margin-bottom: 4px; }
  .di-text { font-size: 13px; color: #14532D; line-height: 1.5; }
  .question-box {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: 10px;
    padding: 12px;
    margin-top: 10px;
  }
  .q-title { font-weight: 700; font-size: 13px; color: #B45309; margin-bottom: 4px; }
  .q-text { font-size: 13px; color: #78350F; line-height: 1.5; }
  .bubble-footer { background: #F8FAFC; padding: 14px 18px; border-top: 1px solid #E2E8F0; }
  .source-label { font-size: 12px; color: #64748B; margin-bottom: 8px; }
  .read-btn {
    display: block;
    text-align: center;
    color: #FFFFFF;
    text-decoration: none;
    padding: 10px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
  }
</style>
</head>
<body>
  <nav class="top-nav">
    <a class="nav-btn active" href="index.html">📰 คลังการ์ดข่าวรายวัน (News Archive)</a>
    <a class="nav-btn" href="theories.html">🎓 คลังทฤษฎี & อินโฟกราฟิกเจาะลึก (Learning Theories Hub)</a>
  </nav>
  <header>
    <h1>📚 คลังความรู้ข่าวสังคมวิทยา & ทฤษฎีการเรียนรู้</h1>
    <p>รวบรวมการ์ดวิเคราะห์ข่าวประจำวัน (การศึกษา, การเมืองไทย, การเคลื่อนไหวทางสังคม และสถานการณ์โลก) เชื่อมโยงแว่นทฤษฎีสังคมวิทยาและศาสตร์การเรียนรู้ (Constructivism, Direct Instruction, 4-Phase Interest, Scaffolding, Connectivism)</p>
  </header>
  <div class="container">
    <div class="controls">
      <input id="searchInput" class="search-input" type="search" placeholder="🔍 ค้นหาชื่อทฤษฎี (เช่น Vygotsky, Direct Instruction, Bourdieu) หรือหัวข้อข่าว..." />
      <div class="filter-pills" id="categoryPills">
        <button class="pill active" data-cat="all">ทั้งหมด</button>
        <button class="pill" data-cat="education_learning">📚 การศึกษาและการเรียนรู้</button>
        <button class="pill" data-cat="thai_politics">🏛️ การเมืองไทย</button>
        <button class="pill" data-cat="social_movement">✊ การเคลื่อนไหวทางสังคม</button>
        <button class="pill" data-cat="world_news">🌍 ข่าวสำคัญของโลก</button>
      </div>
    </div>
    <div id="cardsGrid" class="grid"></div>
  </div>

  <script>
    const ARCHIVE_DATA = ${JSON.stringify(updatedArchive)};
    const THEMES = ${JSON.stringify(THEMES)};
    let currentCat = 'all';

    function escapeHtml(s = '') {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderCards() {
      const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
      const grid = document.getElementById('cardsGrid');
      const filtered = ARCHIVE_DATA.filter(item => {
        if (currentCat !== 'all' && item.category_key !== currentCat) return false;
        if (!q) return true;
        const hay = [
          item.headline,
          item.what_happened,
          item.social_theory_name,
          item.social_theory_analysis,
          item.learning_theory_name,
          item.learning_theory_reflection,
          item.direct_instruction_steps
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });

      grid.innerHTML = filtered.map(card => {
        const theme = THEMES[card.category_key] || THEMES.thai_politics;
        const editionBadge = card.edition === 'morning' ? '🌅 รอบเช้า' : '🌇 รอบเย็น';
        return \`
          <div class="bubble" id="\${escapeHtml(card.card_id || '')}">
            <div class="bubble-header" style="background:\${theme.header_bg};">
              <div class="header-top">
                <span class="cat-badge" style="background:\${theme.badge_bg};color:\${theme.badge_text};">\${theme.icon} \${escapeHtml(card.category_label)}</span>
                <span class="edition-badge">\${escapeHtml(card.date_label || '')} | \${editionBadge}</span>
              </div>
              <div class="headline">\${escapeHtml(card.headline)}</div>
            </div>
            <div class="bubble-body">
              <div class="section">
                <div class="sec-title">📌 สรุปข้อเท็จจริง (What Happened)</div>
                <div class="sec-text">\${escapeHtml(card.what_happened)}</div>
              </div>
              <hr/>
              <div class="section">
                <div class="sec-title" style="color:\${theme.accent};">🔍 มองผ่านแว่นทฤษฎีสังคม</div>
                <div class="sec-sub">ทฤษฎี: \${escapeHtml(card.social_theory_name)}</div>
                <div class="sec-text">\${escapeHtml(card.social_theory_analysis)}</div>
              </div>
              <hr/>
              <div class="section">
                <div class="sec-title" style="color:#047857;">💡 เชื่อมโยงทฤษฎีการเรียนรู้</div>
                <div class="sec-sub">แนวคิด: \${escapeHtml(card.learning_theory_name)}</div>
                <div class="sec-text">\${escapeHtml(card.learning_theory_reflection)}</div>
              </div>
              <div class="di-box">
                <div class="di-title">🎓 สรุปทฤษฎีเข้าใจไว (Direct Instruction 3 ขั้นตอน)</div>
                <div class="di-text">\${escapeHtml(card.direct_instruction_steps || '')}</div>
              </div>
              <div class="question-box">
                <div class="q-title">💬 คำถามชวนคิดวันนี้</div>
                <div class="q-text">\${escapeHtml(card.reflection_question)}</div>
              </div>
            </div>
            <div class="bubble-footer">
              <div class="source-label">📰 แหล่งอ้างอิง: \${escapeHtml(card.source_name)}</div>
              <a class="read-btn" style="background:\${theme.accent};" href="\${escapeHtml(card.source_url)}" target="_blank" rel="noopener noreferrer">🔗 อ่านข่าวต้นฉบับ</a>
            </div>
          </div>
        \`;
      }).join('');
    }

    document.getElementById('searchInput').addEventListener('input', renderCards);
    document.querySelectorAll('#categoryPills .pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#categoryPills .pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.getAttribute('data-cat');
        renderCards();
      });
    });

    renderCards();
  </script>
</body>
</html>`;

  fs.writeFileSync(ARCHIVE_HTML_FILE, archiveHtml, "utf-8");
  fs.writeFileSync("preview_flex.html", archiveHtml, "utf-8");
  return newCardsWithIds;
}

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const roundIdx = args.indexOf("--round");
  const roundArg = roundIdx >= 0 ? args[roundIdx + 1] : "auto";
  const nowThHour = (new Date().getUTCHours() + 7) % 24;
  const edition =
    roundArg === "morning" || roundArg === "evening"
      ? roundArg
      : nowThHour < 14
        ? "morning"
        : "evening";

  const history = loadHistory();
  const rotatedTheories = selectRotatedTheories(history);
  console.log(
    "🔄 ทฤษฎีการเรียนรู้ที่หมุนเวียนมาใช้ในรอบนี้:",
    rotatedTheories.map((t) => t.id).join(", ")
  );

  const newsByCategory = await fetchAllNews(history);
  const digest = await analyzeWithGeminiOrFallback(
    newsByCategory,
    edition,
    rotatedTheories
  );

  const cardsWithIds = updateKnowledgeArchive(digest, edition);

  const flexPayload = {
    type: "flex",
    altText: "📰 สรุปข่าวการศึกษา การเมือง สังคม และโลก ผ่านแว่นสังคมวิทยาและการเรียนรู้",
    contents: {
      type: "carousel",
      contents: [
        ...cardsWithIds.map((c) => buildBubble(c, edition, c.card_id)),
        buildKnowledgeHubBubble(),
      ],
    },
  };

  fs.writeFileSync("latest_flex_payload.json", JSON.stringify(flexPayload, null, 2), "utf-8");

  // บันทึกประวัติข่าวและทฤษฎีที่ใช้ในรอบนี้เพื่อไม่ให้รอบหน้าซ้ำ
  history.used_urls = [
    ...(history.used_urls || []),
    ...cardsWithIds.map((c) => c.source_url).filter(Boolean),
  ];
  history.used_titles = [
    ...(history.used_titles || []),
    ...cardsWithIds.map((c) => c.headline).filter(Boolean),
  ];
  history.last_theory_ids = rotatedTheories.map((t) => t.id);
  saveHistory(history);

  console.log(
    "✅ อัปเดตคลังความรู้ (docs/index.html), ประวัติป้องกันข่าวซ้ำ (sent_history.json) และ Flex JSON เรียบร้อยแล้ว!"
  );

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
  console.log("🎉 ส่งการ์ดข่าวพร้อมปุ่มคลังความรู้ทฤษฎีเข้า LINE Official Account สำเร็จเรียบร้อย!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
