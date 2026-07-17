// One-off generator: extracts 366 well-known / representative verses from
// db/web.sqlite into a JSON file bundled as a resource in the Apple Watch app
// and its verse-of-the-day complication.
//
// Selection strategy (fully deterministic):
//   1. A curated list of ~120 famous verses (John 3:16, Psalm 23:1, ...).
//   2. The rest is filled with one representative short verse per chapter,
//      drawn round-robin from Psalms, Proverbs, the Gospels, and the
//      Epistles ("shortest verse of the chapter that is 40-200 chars").
//   3. The 366 entries are shuffled with a seeded PRNG so genres mix
//      across the year, then assigned dayOfYear 1..366.
//
// Usage: node scripts/generateVerseOfTheDay.mjs

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB = path.join(root, "db", "web.sqlite");
const OUT = path.join(root, "ios", "App", "WatchShared", "VerseOfTheDay.json");

const BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalm","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah",
  "Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
  "2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
];
const id = (name) => BOOKS.indexOf(name) + 1;

// Curated famous verses: [bookName, chapter, verse]
const FAMOUS = [
  ["John", 3, 16], ["Psalm", 23, 1], ["Genesis", 1, 1], ["Philippians", 4, 13],
  ["Jeremiah", 29, 11], ["Romans", 8, 28], ["Proverbs", 3, 5], ["Proverbs", 3, 6],
  ["Isaiah", 41, 10], ["Isaiah", 40, 31], ["Psalm", 46, 1], ["Matthew", 6, 33],
  ["Joshua", 1, 9], ["Romans", 12, 2], ["Galatians", 5, 22], ["Galatians", 5, 23],
  ["Hebrews", 11, 1], ["2 Timothy", 1, 7], ["Psalm", 119, 105], ["Matthew", 11, 28],
  ["John", 14, 6], ["Ephesians", 2, 8], ["Romans", 3, 23], ["Romans", 6, 23],
  ["Romans", 5, 8], ["Romans", 10, 9], ["John", 1, 1], ["John", 8, 32],
  ["John", 10, 10], ["John", 13, 34], ["John", 15, 13], ["John", 16, 33],
  ["1 Corinthians", 13, 4], ["1 Corinthians", 13, 13], ["1 Corinthians", 10, 13],
  ["1 Corinthians", 16, 14], ["2 Corinthians", 5, 17], ["2 Corinthians", 12, 9],
  ["Philippians", 4, 6], ["Philippians", 4, 7], ["Philippians", 4, 8],
  ["Philippians", 1, 21], ["Colossians", 3, 23], ["1 Thessalonians", 5, 16],
  ["1 Thessalonians", 5, 17], ["1 Thessalonians", 5, 18], ["James", 1, 5],
  ["James", 1, 22], ["James", 4, 7], ["1 Peter", 5, 7], ["1 Peter", 3, 15],
  ["1 John", 1, 9], ["1 John", 4, 8], ["1 John", 4, 19], ["Revelation", 3, 20],
  ["Revelation", 21, 4], ["Psalm", 27, 1], ["Psalm", 34, 8], ["Psalm", 37, 4],
  ["Psalm", 46, 10], ["Psalm", 51, 10], ["Psalm", 56, 3], ["Psalm", 90, 12],
  ["Psalm", 91, 1], ["Psalm", 100, 4], ["Psalm", 103, 1], ["Psalm", 118, 24],
  ["Psalm", 121, 1], ["Psalm", 121, 2], ["Psalm", 133, 1], ["Psalm", 136, 1],
  ["Psalm", 139, 14], ["Psalm", 145, 9], ["Psalm", 150, 6], ["Proverbs", 4, 23],
  ["Proverbs", 16, 3], ["Proverbs", 16, 9], ["Proverbs", 17, 17], ["Proverbs", 18, 10],
  ["Proverbs", 22, 6], ["Proverbs", 27, 17], ["Proverbs", 31, 25], ["Ecclesiastes", 3, 1],
  ["Ecclesiastes", 4, 9], ["Isaiah", 9, 6], ["Isaiah", 26, 3], ["Isaiah", 53, 5],
  ["Isaiah", 55, 8], ["Isaiah", 55, 9], ["Lamentations", 3, 22], ["Lamentations", 3, 23],
  ["Micah", 6, 8], ["Habakkuk", 3, 19], ["Zephaniah", 3, 17], ["Malachi", 3, 6],
  ["Matthew", 5, 14], ["Matthew", 5, 16], ["Matthew", 6, 34], ["Matthew", 7, 7],
  ["Matthew", 19, 26], ["Matthew", 22, 37], ["Matthew", 22, 39], ["Matthew", 28, 19],
  ["Matthew", 28, 20], ["Mark", 9, 23], ["Mark", 10, 27], ["Mark", 11, 24],
  ["Mark", 12, 30], ["Luke", 1, 37], ["Luke", 6, 31], ["Luke", 9, 23],
  ["Luke", 12, 32], ["John", 11, 25], ["Acts", 1, 8], ["Acts", 4, 12],
  ["Acts", 16, 31], ["Romans", 1, 16], ["Romans", 8, 31], ["Romans", 8, 38],
  ["Romans", 8, 39], ["Romans", 12, 12], ["Romans", 15, 13], ["Galatians", 2, 20],
  ["Galatians", 6, 9], ["Ephesians", 3, 20], ["Ephesians", 4, 32], ["Ephesians", 6, 10],
  ["Hebrews", 4, 12], ["Hebrews", 12, 1], ["Hebrews", 12, 2], ["Hebrews", 13, 8],
  ["1 Timothy", 4, 12], ["2 Timothy", 3, 16], ["Titus", 3, 5], ["1 Peter", 2, 9],
  ["2 Peter", 3, 9], ["Deuteronomy", 31, 6], ["Exodus", 14, 14], ["Numbers", 6, 24],
  ["Numbers", 6, 25], ["Numbers", 6, 26], ["1 Samuel", 16, 7], ["2 Chronicles", 7, 14],
  ["Nehemiah", 8, 10], ["Job", 19, 25], ["Ruth", 1, 16],
];

function sql(query) {
  const out = execFileSync("sqlite3", ["-separator", "", DB, query], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => l.split(""));
}

// Load every verse once: book_id -> chapter -> [{number, text}]
const all = new Map();
for (const [b, c, n, t] of sql("SELECT book_id, chapter, number, text FROM verses ORDER BY book_id, chapter, number;")) {
  const bi = +b, ci = +c;
  if (!all.has(bi)) all.set(bi, new Map());
  if (!all.get(bi).has(ci)) all.get(bi).set(ci, []);
  all.get(bi).get(ci).push({ number: +n, text: t });
}

const clean = (t) => t.replace(/\s+/g, " ").trim();
const refOf = (b, c, v) => `${BOOKS[b - 1]} ${c}:${v}`;
const used = new Set();
const entries = [];

function push(b, c, v, text) {
  const key = `${b}:${c}:${v}`;
  if (used.has(key)) return false;
  used.add(key);
  entries.push({ ref: refOf(b, c, v), text: clean(text) });
  return true;
}

// 1. Famous verses first.
for (const [name, c, v] of FAMOUS) {
  const b = id(name);
  const verse = all.get(b)?.get(c)?.find((x) => x.number === v);
  if (!verse) {
    console.warn(`missing: ${name} ${c}:${v}`);
    continue;
  }
  push(b, c, v, verse.text);
}
console.log(`famous verses: ${entries.length}`);

// 2. Fill with one representative short verse per chapter, round-robin
//    across genre pools so the mix stays balanced.
function chapterPick(b, c) {
  const verses = all.get(b)?.get(c) ?? [];
  const eligible = verses
    .filter((v) => {
      const len = clean(v.text).length;
      return len >= 40 && len <= 200 && !used.has(`${b}:${c}:${v.number}`);
    })
    .sort((x, y) => clean(x.text).length - clean(y.text).length || x.number - y.number);
  return eligible[0] ?? null;
}

const pools = [
  // Psalms
  Array.from({ length: 150 }, (_, i) => [id("Psalm"), i + 1]),
  // Proverbs
  Array.from({ length: 31 }, (_, i) => [id("Proverbs"), i + 1]),
  // Gospels
  ["Matthew", "Mark", "Luke", "John"].flatMap((n) =>
    Array.from(all.get(id(n)).keys()).map((c) => [id(n), c])
  ),
  // Epistles (Romans..Jude)
  BOOKS.slice(44, 65).flatMap((n) =>
    Array.from(all.get(id(n)).keys()).map((c) => [id(n), c])
  ),
];

const cursors = pools.map(() => 0);
let poolIdx = 0;
while (entries.length < 366) {
  let advanced = false;
  for (let tries = 0; tries < pools.length && entries.length < 366; tries++) {
    const p = (poolIdx + tries) % pools.length;
    while (cursors[p] < pools[p].length) {
      const [b, c] = pools[p][cursors[p]++];
      const pick = chapterPick(b, c);
      if (pick && push(b, c, pick.number, pick.text)) {
        advanced = true;
        poolIdx = p + 1;
        break;
      }
    }
    if (advanced) break;
  }
  if (!advanced) throw new Error("ran out of candidate verses before 366");
}

// 3. Deterministic shuffle (mulberry32, seed 20260101) -> dayOfYear 1..366.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260101);
for (let i = entries.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [entries[i], entries[j]] = [entries[j], entries[i]];
}

const out = entries.map((e, i) => ({ dayOfYear: i + 1, ref: e.ref, text: e.text }));
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${out.length} verses -> ${OUT}`);
