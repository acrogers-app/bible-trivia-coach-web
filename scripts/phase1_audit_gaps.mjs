import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const PACK = "public/packs/trivia_core_en_v1.json";
const DB   = path.join(process.cwd(), "db/web.sqlite");
const OUT  = "scripts/phase1_gaps.json";

const db = new Database(DB, { readonly: true });

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

// Canonical book display names
const ID_TO_BOOK = Object.fromEntries(Object.entries(BOOK_TO_ID).map(([k,v])=>[v,k]));

// Pretty display name
const DISPLAY = {
  1:"Genesis",2:"Exodus",3:"Leviticus",4:"Numbers",5:"Deuteronomy",
  6:"Joshua",7:"Judges",8:"Ruth",9:"1 Samuel",10:"2 Samuel",
  11:"1 Kings",12:"2 Kings",13:"1 Chronicles",14:"2 Chronicles",
  15:"Ezra",16:"Nehemiah",17:"Esther",18:"Job",19:"Psalms",20:"Proverbs",
  21:"Ecclesiastes",22:"Song of Solomon",23:"Isaiah",24:"Jeremiah",
  25:"Lamentations",26:"Ezekiel",27:"Daniel",28:"Hosea",29:"Joel",
  30:"Amos",31:"Obadiah",32:"Jonah",33:"Micah",34:"Nahum",35:"Habakkuk",
  36:"Zephaniah",37:"Haggai",38:"Zechariah",39:"Malachi",
  40:"Matthew",41:"Mark",42:"Luke",43:"John",44:"Acts",45:"Romans",
  46:"1 Corinthians",47:"2 Corinthians",48:"Galatians",49:"Ephesians",
  50:"Philippians",51:"Colossians",52:"1 Thessalonians",53:"2 Thessalonians",
  54:"1 Timothy",55:"2 Timothy",56:"Titus",57:"Philemon",58:"Hebrews",
  59:"James",60:"1 Peter",61:"2 Peter",62:"1 John",63:"2 John",
  64:"3 John",65:"Jude",66:"Revelation"
};

// NT books get higher priority
const NT_BOOKS = new Set([40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66]);
const PRIORITY_BOOKS = new Set([40,41,42,43,44,19,20,1,23]); // Gospels/Acts/Psalms/Proverbs/Genesis/Isaiah

function normRef(s) {
  return String(s||"")
    .replace(/\u00A0/g," ").replace(/\s+/g," ").trim()
    .replace(/^psalm(\s+\d)/i,"Psalms$1")
    .replace(/^revelations\b/i,"Revelation")
    .replace(/^(First|1st)\s+/i,"1 ")
    .replace(/^(Second|2nd)\s+/i,"2 ")
    .replace(/^(Third|3rd)\s+/i,"3 ");
}

function parseRef(s) {
  const m = normRef(s).match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOK_TO_ID[m[1].toLowerCase().replace(/\s+/g," ").trim()];
  if (!bookId) return null;
  return { bookId, ch: +m[2], vs: +m[3] };
}

// Count questions per chapter
const chapterCount = new Map(); // key: "bookId:ch"

const pack = JSON.parse(fs.readFileSync(PACK,"utf8"));
for (const q of pack.questions) {
  const s = parseRef(q.refStart);
  if (!s) continue;
  const key = `${s.bookId}:${s.ch}`;
  chapterCount.set(key, (chapterCount.get(key)||0) + 1);
}

// Get all chapters from DB
const allChapters = db.prepare(
  "SELECT DISTINCT book_id, chapter FROM verses ORDER BY book_id, chapter"
).all();

const MIN_QUESTIONS = 3;
const gaps = [];

for (const row of allChapters) {
  const key   = `${row.book_id}:${row.chapter}`;
  const count = chapterCount.get(key) || 0;
  if (count < MIN_QUESTIONS) {
    const bookName = DISPLAY[row.book_id] || ID_TO_BOOK[row.book_id] || `Book${row.book_id}`;
    const isNT     = NT_BOOKS.has(row.book_id);
    const isPri    = PRIORITY_BOOKS.has(row.book_id);

    // Get verse count for this chapter
    const { verseCount } = db.prepare(
      "SELECT COUNT(*) as verseCount FROM verses WHERE book_id=? AND chapter=?"
    ).get(row.book_id, row.chapter);

    gaps.push({
      bookId:     row.book_id,
      bookName,
      chapter:    row.chapter,
      have:       count,
      need:       MIN_QUESTIONS - count,
      verseCount,
      priority:   isPri ? 1 : isNT ? 2 : 3
    });
  }
}

// Sort: priority 1 first, then by bookId+chapter
gaps.sort((a,b) => a.priority - b.priority || a.bookId - b.bookId || a.chapter - b.chapter);

fs.writeFileSync(OUT, JSON.stringify(gaps, null, 2));

// Stats
const byPriority = [1,2,3].map(p => gaps.filter(g=>g.priority===p).length);
console.log(`\n=== Phase 1: Gap Audit ===`);
console.log(`Total Bible chapters:          ${allChapters.length}`);
console.log(`Chapters with < ${MIN_QUESTIONS} questions:  ${gaps.length}`);
console.log(`  Priority 1 (Gospels+):       ${byPriority[0]}`);
console.log(`  Priority 2 (Rest of NT):     ${byPriority[1]}`);
console.log(`  Priority 3 (OT):             ${byPriority[2]}`);
console.log(`\nGap file saved: ${OUT}`);
console.log(`\nTop 20 gaps:`);
gaps.slice(0,20).forEach(g =>
  console.log(`  ${g.bookName.padEnd(20)} ch.${String(g.chapter).padEnd(4)} have:${g.have} need:${g.need}`)
);
