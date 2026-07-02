import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB   = path.join(process.cwd(), 'db/web.sqlite');
const OUT  = 'public/data/reading_plan_en_v1.json';
const BAK  = `${OUT}.bak.${Date.now()}`;

const db = new Database(DB, { readonly: true });

// ── Canonical book names (book_id 1–66) ─────────────────────────────────────
const BOOKS = [
  null, // 0-index pad
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
  'Joshua','Judges','Ruth','1 Samuel','2 Samuel',
  '1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs',
  'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations',
  'Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts',
  'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy',
  '2 Timothy','Titus','Philemon','Hebrews','James',
  '1 Peter','2 Peter','1 John','2 John','3 John',
  'Jude','Revelation',
];

// ── Load all chapters from DB (preserves actual verse counts) ───────────────
const rows = db.prepare(
  `SELECT book_id, chapter,
          MIN(number) as first_verse,
          MAX(number) as last_verse,
          COUNT(*)    as verse_count
   FROM verses
   GROUP BY book_id, chapter
   ORDER BY book_id, chapter`
).all();

// Build flat chapter list: [{bookId, chapter, firstVerse, lastVerse, verseCount}]
const chapters = rows.map(r => ({
  bookId:     r.book_id,
  bookName:   BOOKS[r.book_id],
  chapter:    r.chapter,
  firstVerse: r.first_verse,
  lastVerse:  r.last_verse,
  verseCount: r.verse_count,
}));

console.log(`Total chapters: ${chapters.length}`);
console.log(`Total verses:   ${chapters.reduce((s,c) => s + c.verseCount, 0)}`);

// ── Group chapters into 365 days ─────────────────────────────────────────────
// Strategy: fill each day to ~TARGET_VERSES verses, never split a chapter,
// never mix books within a day's passage (keep clean start/end refs).
// We do allow multi-chapter same-book days.

const TARGET_VERSES = Math.ceil(
  chapters.reduce((s,c) => s + c.verseCount, 0) / 365
); // ~85 verses/day

console.log(`Target verses/day: ${TARGET_VERSES}`);

const days = [];
let i = 0;

while (i < chapters.length && days.length < 365) {
  const dayNum = days.length + 1;
  const startChap = chapters[i];
  const bookId    = startChap.bookId;

  let versesSoFar = 0;
  let j = i;

  // Always include at least 1 chapter
  // Keep adding from same book until we hit target or book ends
  while (j < chapters.length) {
    const c = chapters[j];

    // Don't cross book boundaries mid-day
    if (c.bookId !== bookId) break;

    versesSoFar += c.verseCount;
    j++;

    // Stop if we've hit the target (but include current chapter fully)
    if (versesSoFar >= TARGET_VERSES) break;

    // Never let a day get too long (2x target)
    if (versesSoFar >= TARGET_VERSES * 2) break;
  }

  const endChap = chapters[j - 1];

  // Build title
  let title;
  const bookName = startChap.bookName;
  if (startChap.chapter === endChap.chapter) {
    title = `${bookName} ${startChap.chapter}`;
  } else {
    title = `${bookName} ${startChap.chapter}–${endChap.chapter}`;
  }

  const start = `${bookName} ${startChap.chapter}:${startChap.firstVerse}`;
  const end   = `${bookName} ${endChap.chapter}:${endChap.lastVerse}`;

  days.push({ day: dayNum, title, start, end, verseCount: versesSoFar });
  i = j;
}

// If we ran out of chapters before 365 days, the last day is done.
// If we have leftover days, that's fine (365 is a cap).
const actualDays = days.length;
console.log(`Generated: ${actualDays} days`);

// ── Validate every ref against DB ───────────────────────────────────────────
const existsStmt = db.prepare(
  'SELECT 1 FROM verses WHERE book_id=? AND chapter=? AND number=? LIMIT 1'
);

const BOOK_TO_ID = Object.fromEntries(
  BOOKS.slice(1).map((name, i) => [name.toLowerCase(), i + 1])
);

function parseRef(ref) {
  const m = String(ref||'').trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOK_TO_ID[m[1].toLowerCase()];
  if (!bookId) return null;
  return { bookId, ch: +m[2], vs: +m[3] };
}

let bad = 0;
for (const d of days) {
  const s = parseRef(d.start);
  const e = parseRef(d.end);
  if (!s || !e || !existsStmt.get(s.bookId, s.ch, s.vs) || !existsStmt.get(e.bookId, e.ch, e.vs)) {
    console.error(`BAD day ${d.day}: ${d.start} – ${d.end}`);
    bad++;
  }
}

if (bad > 0) {
  console.error(`\n${bad} bad refs — aborting.`);
  process.exit(1);
}

console.log('All refs validated against DB ✓');

// ── Stats ────────────────────────────────────────────────────────────────────
const verseCounts = days.map(d => d.verseCount);
const avg  = Math.round(verseCounts.reduce((a,b) => a+b, 0) / days.length);
const min  = Math.min(...verseCounts);
const max  = Math.max(...verseCounts);
console.log(`Verses/day — avg: ${avg}  min: ${min}  max: ${max}`);

// Strip verseCount from output (internal only)
const cleanDays = days.map(({ verseCount: _, ...d }) => d);

// ── Save ──────────────────────────────────────────────────────────────────────
if (fs.existsSync(OUT)) fs.copyFileSync(OUT, BAK);

const plan = {
  id:   'through_bible_en_365_v1',
  name: 'Through the Bible in a Year',
  days: cleanDays,
};

fs.writeFileSync(OUT, JSON.stringify(plan, null, 2));
console.log(`\nSaved: ${OUT}  (${actualDays} days)`);
console.log(`Backup: ${BAK}`);

// Preview first and last 3 days
console.log('\nFirst 3 days:');
cleanDays.slice(0,3).forEach(d =>
  console.log(`  Day ${d.day}: ${d.title} (${d.start} – ${d.end})`)
);
console.log('\nLast 3 days:');
cleanDays.slice(-3).forEach(d =>
  console.log(`  Day ${d.day}: ${d.title} (${d.start} – ${d.end})`)
);
