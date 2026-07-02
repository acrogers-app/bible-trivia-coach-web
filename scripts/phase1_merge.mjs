import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const PACK      = "public/packs/trivia_core_en_v1.json";
const GENERATED = "scripts/phase1_generated.json";
const DB        = path.join(process.cwd(), "db/web.sqlite");
const REPORT    = "scripts/phase1_merge_report.json";

if (!fs.existsSync(GENERATED)) {
  console.error("No generated file found. Run phase1_generate.py first.");
  process.exit(1);
}

const db = new Database(DB, { readonly: true });
const existsStmt = db.prepare(
  "SELECT 1 FROM verses WHERE book_id=? AND chapter=? AND number=? LIMIT 1"
);

const BOOK_TO_ID = {
  genesis:1, exodus:2, leviticus:3, numbers:4, deuteronomy:5,
  joshua:6, judges:7, ruth:8, "1 samuel":9, "2 samuel":10,
  "1 kings":11, "2 kings":12, "1 chronicles":13, "2 chronicles":14,
  ezra:15, nehemiah:16, esther:17, job:18, psalms:19, proverbs:20,
  ecclesiastes:21, "song of solomon":22, isaiah:23, jeremiah:24,
  lamentations:25, ezekiel:26, daniel:27, hosea:28, joel:29, amos:30,
  obadiah:31, jonah:32, micah:33, nahum:34, habakkuk:35, zephaniah:36,
  haggai:37, zechariah:38, malachi:39, matthew:40, mark:41, luke:42,
  john:43, acts:44, romans:45, "1 corinthians":46, "2 corinthians":47,
  galatians:48, ephesians:49, philippians:50, colossians:51,
  "1 thessalonians":52, "2 thessalonians":53, "1 timothy":54,
  "2 timothy":55, titus:56, philemon:57, hebrews:58, james:59,
  "1 peter":60, "2 peter":61, "1 john":62, "2 john":63, "3 john":64,
  jude:65, revelation:66
};

function normBook(n) {
  return String(n||"").toLowerCase().replace(/\s+/g," ").trim()
    .replace(/^psalm\b/,"psalms").replace(/^revelations\b/,"revelation");
}

function parseRef(s) {
  const m = String(s||"").trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOK_TO_ID[normBook(m[1])];
  if (!bookId) return null;
  return { bookId, ch:+m[2], vs:+m[3] };
}

function validateQuestion(q) {
  const errors = [];

  if (!q.text?.trim()) errors.push("missing text");
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push("options must be 4");
  if (!q.options?.includes(q.answer)) errors.push("answer not in options");
  if (!q.refStart?.trim()) errors.push("missing refStart");
  if (!q.refEnd?.trim()) errors.push("missing refEnd");
  if (!["easy","medium","hard"].includes(q.difficulty)) errors.push("invalid difficulty");
  if (!["scripture","history"].includes(q.sourceType)) errors.push("invalid sourceType");

  const s = parseRef(q.refStart);
  const e = parseRef(q.refEnd);
  if (!s) errors.push(`unparseable refStart: ${q.refStart}`);
  if (!e) errors.push(`unparseable refEnd: ${q.refEnd}`);

  if (s && !existsStmt.get(s.bookId, s.ch, s.vs)) {
    errors.push(`refStart not in DB: ${q.refStart}`);
  }
  if (e && !existsStmt.get(e.bookId, e.ch, e.vs)) {
    errors.push(`refEnd not in DB: ${q.refEnd}`);
  }

  return errors;
}

const pack      = JSON.parse(fs.readFileSync(PACK, "utf8"));
const generated = JSON.parse(fs.readFileSync(GENERATED, "utf8"));

// Existing IDs (for dedup)
const existingIds = new Set(pack.questions.map(q => q.id));

let accepted = 0, rejected = 0;
const rejectedList = [];
const accepted_list = [];

for (const q of generated) {
  // Skip dupes
  if (existingIds.has(q.id)) {
    // Make unique ID
    q.id = q.id + "_" + Date.now().toString(36).slice(-4);
  }

  const errs = validateQuestion(q);
  if (errs.length > 0) {
    rejected++;
    rejectedList.push({ id: q.id, errors: errs, q });
    continue;
  }

  // Ensure required fields
  q.sourceType = q.sourceType || "scripture";
  q.playful    = q.playful ?? false;
  q.category   = q.category || "General";

  pack.questions.push(q);
  existingIds.add(q.id);
  accepted++;
  accepted_list.push(q.id);
}

// Backup + save
const bak = `${PACK}.bak.merge.${Date.now()}`;
fs.copyFileSync(PACK, bak);
fs.writeFileSync(PACK, JSON.stringify(pack, null, 2));

// Report
const report = {
  timestamp:      new Date().toISOString(),
  totalInPack:    pack.questions.length,
  accepted,
  rejected,
  rejectedList,
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(`\n=== Phase 1: Merge ===`);
console.log(`Generated questions:  ${generated.length}`);
console.log(`Accepted + merged:    ${accepted}`);
console.log(`Rejected (bad refs):  ${rejected}`);
console.log(`Total in pack now:    ${pack.questions.length}`);
console.log(`Backup saved:         ${bak}`);
console.log(`Report:               ${REPORT}`);

if (rejected > 0) {
  console.log(`\nRejected questions saved in report for manual review.`);
}
