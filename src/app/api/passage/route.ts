import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

export const runtime = 'nodejs';

type Ref = { bookId: number; chapter: number; verse: number };
type VerseLine = { chapter: number; verse: number; text: string };

const bookToId: Record<string, number> = {
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5,
  joshua: 6, judges: 7, ruth: 8, '1 samuel': 9, '2 samuel': 10,
  '1 kings': 11, '2 kings': 12, '1 chronicles': 13, '2 chronicles': 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18, psalms: 19,
  proverbs: 20, ecclesiastes: 21, 'song of solomon': 22, isaiah: 23,
  jeremiah: 24, lamentations: 25, ezekiel: 26, daniel: 27,
  hosea: 28, joel: 29, amos: 30, obadiah: 31, jonah: 32,
  micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39,
  matthew: 40, mark: 41, luke: 42, john: 43, acts: 44,
  romans: 45, '1 corinthians': 46, '2 corinthians': 47, galatians: 48,
  ephesians: 49, philippians: 50, colossians: 51, '1 thessalonians': 52,
  '2 thessalonians': 53, '1 timothy': 54, '2 timothy': 55, titus: 56,
  philemon: 57, hebrews: 58, james: 59, '1 peter': 60, '2 peter': 61,
  '1 john': 62, '2 john': 63, '3 john': 64, jude: 65, revelation: 66
};

let db: InstanceType<typeof Database> | null = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'db', 'web.sqlite');
    db = new Database(dbPath, { readonly: true });
  }
  return db;
}

function normalizeBookKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseRef(input: string): Ref | null {
  const trimmed = input.trim();
  const pattern = /^\s*(.+?)\s+(\d+):(\d+)\s*$/;
  const match = trimmed.match(pattern);
  if (!match) return null;
  const [, bookName, chStr, vsStr] = match;
  const key = normalizeBookKey(bookName);
  const bookId = bookToId[key];
  const ch = parseInt(chStr, 10);
  const vs = parseInt(vsStr, 10);
  if (!bookId || Number.isNaN(ch) || Number.isNaN(vs)) return null;
  return { bookId, chapter: ch, verse: vs };
}


const MAX_CHAPTER_SPAN = 10; // max chapters allowed in a single /api/passage request
const ABS_MAX_CHAPTER = 200; // absolute sanity cap (Bible max is 150 in Psalms)
const ABS_MAX_VERSE = 300;   // absolute sanity cap

function normalizeOrder(s: Ref, e: Ref): [Ref, Ref] {
  let a = s;
  let b = e;
  if (a.chapter > b.chapter || (a.chapter === b.chapter && a.verse > b.verse)) {
    a = e;
    b = s;
  }
  return [a, b];
}

function getMaxChapter(bookId: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT MAX(chapter) AS maxChapter FROM verses WHERE book_id = ?')
    .get(bookId) as { maxChapter: number | null };
  return row?.maxChapter ?? 0;
}

function getMaxVerse(bookId: number, chapter: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT MAX(number) AS maxVerse FROM verses WHERE book_id = ? AND chapter = ?')
    .get(bookId, chapter) as { maxVerse: number | null };
  return row?.maxVerse ?? 0;
}

function invalidRef(msg = 'Invalid reference') {
  return NextResponse.json({ error: 'Failed to load passage' }, { status: 500 });
}
}
