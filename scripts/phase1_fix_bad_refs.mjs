import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const PACK = "public/packs/trivia_core_en_v1.json";
const DB   = path.join(process.cwd(), "db/web.sqlite");

const db = new Database(DB, { readonly: true });

const lastVerseStmt = db.prepare(
  "SELECT MAX(number) as last FROM verses WHERE book_id=? AND chapter=?"
);
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

function normBookKey(s) {
  return String(s)
    .toLowerCase().replace(/\s+/g," ").trim()
    .replace(/^psalm\b/,"psalms")
    .replace(/^ps\.?\b/,"psalms")
    .replace(/^revelations\b/,"revelation")
    .replace(/^song of songs\b/,"song of solomon")
    .replace(/^(first|1st)\s+/,"1 ")
    .replace(/^(second|2nd)\s+/,"2 ")
    .replace(/^(third|3rd)\s+/,"3 ");
}

// Returns {book, ch, vs} or null
function parseSimple(ref) {
  const m = String(ref||"").trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOK_TO_ID[normBookKey(m[1])];
  if (!bookId) return null;
  return { book: m[1], bookId, ch: +m[2], vs: +m[3] };
}

function fixRef(raw) {
  if (!raw) return { start: null, end: null, skip: false };
  const s = String(raw).trim();

  // Already good: "Book ch:vs"
  if (/^.+\s+\d+:\d+$/.test(s) && parseSimple(s)) {
    return { start: s, end: s, skip: false };
  }

  // Range in same verse: "Book ch:vs1-vs2"
  const rangeM = s.match(/^(.+\s+\d+):(\d+)-(\d+)$/);
  if (rangeM) {
    const base  = rangeM[1]; // "Book ch"
    const vs1   = +rangeM[2];
    const vs2   = +rangeM[3];
    const start = `${base}:${vs1}`;
    const end   = `${base}:${vs2}`;
    if (parseSimple(start)) return { start, end, skip: false };
  }

  // Chapter only: "Book ch"
  const chapM = s.match(/^(.+)\s+(\d+)$/);
  if (chapM) {
    const bookKey = normBookKey(chapM[1]);
    const bookId  = BOOK_TO_ID[bookKey];
    const ch      = +chapM[2];
    if (bookId) {
      const row = lastVerseStmt.get(bookId, ch);
      if (row?.last) {
        const start = `${chapM[1]} ${ch}:1`;
        const end   = `${chapM[1]} ${ch}:${row.last}`;
        return { start, end, skip: false };
      }
    }
  }

  // Complex / compound (e.g. "1 Kings 7:13-14 & 48-50") — skip for now
  return { start: null, end: null, skip: true };
}

const pack = JSON.parse(fs.readFileSync(PACK,"utf8"));
let fixed = 0, skipped = 0, alreadyGood = 0;
const manual = [];

for (const q of pack.questions) {
  const sRaw = q.refStart;
  const eRaw = q.refEnd;

  // Only process if at least one is broken
  const sBad = !parseSimple(sRaw);
  const eBad = !parseSimple(eRaw);
  if (!sBad && !eBad) { alreadyGood++; continue; }

  const sf = fixRef(sRaw);
  const ef = fixRef(eRaw);

  if (sf.skip || ef.skip) {
    skipped++;
    manual.push({ id: q.id, refStart: sRaw, refEnd: eRaw });
    continue;
  }

  if (sf.start) { q.refStart = sf.start; q.refEnd = sf.end ?? sf.start; }
  if (ef.start) { q.refEnd   = ef.start; }

  // Verify fixed refs exist in DB
  const ps = parseSimple(q.refStart);
  const pe = parseSimple(q.refEnd);
  if (!ps || !pe || !existsStmt.get(ps.bookId, ps.ch, ps.vs) || !existsStmt.get(pe.bookId, pe.ch, pe.vs)) {
    skipped++;
    manual.push({ id: q.id, refStart: sRaw, refEnd: eRaw, note:"verse_not_in_db" });
    // Restore originals
    q.refStart = sRaw;
    q.refEnd   = eRaw;
    continue;
  }

  fixed++;
}

// Backup before overwrite
const bak = `${PACK}.bak.fixrefs.${Date.now()}`;
fs.copyFileSync(PACK, bak);
fs.writeFileSync(PACK, JSON.stringify(pack, null, 2));
fs.writeFileSync("scripts/phase1_manual_refs.json", JSON.stringify(manual, null, 2));

console.log(`\n=== Phase 1: Fix Bad Refs ===`);
console.log(`Already good:   ${alreadyGood}`);
console.log(`Fixed:          ${fixed}`);
console.log(`Need manual:    ${skipped}`);
console.log(`\nManual review needed: scripts/phase1_manual_refs.json`);
console.log(`Backup saved:         ${bak}`);
