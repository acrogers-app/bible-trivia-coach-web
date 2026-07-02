import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

export const runtime = 'nodejs';

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

// keep aliases consistent with /api/passage
function normalizeBookNameInput(name: string): string {
  let t = name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  t = t
    .replace(/^(First|1st)\s+/i, '1 ')
    .replace(/^(Second|2nd)\s+/i, '2 ')
    .replace(/^(Third|3rd)\s+/i, '3 ')
    .replace(/^(III)\s+/i, '3 ')
    .replace(/^(II)\s+/i, '2 ')
    .replace(/^(I)\s+/i, '1 ')
    .replace(/^([123])(?=[A-Za-z])/, '$1 ');

  t = t
    .replace(/^Psalm\b/i, 'Psalms')
    .replace(/^Ps\.?\b/i, 'Psalms')
    .replace(/^Revelations\b/i, 'Revelation')
    .replace(/^Song of Songs\b/i, 'Song of Solomon')
    .replace(/^Canticles\b/i, 'Song of Solomon');

  return t;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookRaw = searchParams.get('book');
  const chapterRaw = searchParams.get('chapter');

  if (!bookRaw || !chapterRaw) {
    return NextResponse.json(
      { error: 'Missing book or chapter query parameters' },
      { status: 400 }
    );
  }

  const chapter = parseInt(chapterRaw, 10);
  if (!Number.isFinite(chapter) || chapter <= 0) {
    return NextResponse.json({ error: 'Invalid chapter' }, { status: 400 });
  }

  const bookName = normalizeBookNameInput(bookRaw);
  const bookKey = normalizeBookKey(bookName);
  const bookId = bookToId[bookKey];

  if (!bookId) {
    return NextResponse.json({ error: `Unsupported book: ${bookRaw}` }, { status: 400 });
  }

  try {
    const db = getDb();
    const stmt = db.prepare(
      'SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY number'
    );
    const lines = stmt.all(bookId, chapter) as VerseLine[];

    if (!lines.length) {
      return NextResponse.json({ error: 'No verses found for that chapter', lines: [] }, { status: 404 });
    }

    const maxVerse = Math.max(...lines.map(l => l.verse));
    return NextResponse.json({ lines, maxVerse });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load chapter from database' },
      { status: 500 }
    );
  }
}
