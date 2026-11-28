// Bundles the World English Bible text for every Learn lesson passage so lessons
// can show (and read aloud) their Scripture with no internet connection.
//
// Reads lesson references from public/data/topics_en_v1.json (and, in preview
// builds, public/data/learn_preview_fixture.json), looks the verses up in
// db/web.sqlite (the same database /api/passage serves), and writes
// public/data/learn_passages_en_v1.json:  { "<start>|<end>": [{ chapter, verse, text }] }
// Lesson files themselves still store references only.
//
// Run: npm run build:learn-passages   (build:mobile runs it automatically)
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const SOURCES = ["public/data/topics_en_v1.json", "public/data/learn_preview_fixture.json"];
const OUT = "public/data/learn_passages_en_v1.json";
const BOOKS = ["genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles","ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi","matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon","hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"];

function parseRef(s) {
  const m = String(s).trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOKS.indexOf(m[1].toLowerCase().replace(/\s+/g, " ")) + 1;
  return bookId ? { bookId, chapter: +m[2], verse: +m[3] } : null;
}

const db = new Database(path.join(process.cwd(), "db", "web.sqlite"), { readonly: true });
const rows = db.prepare(
  "SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND (chapter * 1000 + number) BETWEEN ? AND ? ORDER BY chapter, number",
);

const out = {};
for (const file of SOURCES) {
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const topic of data.topics ?? []) {
    for (const lesson of topic.lessons ?? []) {
      for (const p of lesson.passages ?? []) {
        const a = parseRef(p.start);
        const b = parseRef(p.end);
        if (!a || !b || a.bookId !== b.bookId) throw new Error(`${file}: bad passage ${p.start} – ${p.end}`);
        const lines = rows.all(a.bookId, a.chapter * 1000 + a.verse, b.chapter * 1000 + b.verse);
        if (!lines.length) throw new Error(`${file}: no WEB text for ${p.start} – ${p.end}`);
        out[`${p.start}|${p.end}`] = lines;
      }
    }
  }
}

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`Learn passages: ${Object.keys(out).length} bundled → ${OUT}`);
