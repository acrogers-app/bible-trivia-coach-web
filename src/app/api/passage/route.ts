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

function fetchLines(s: Ref, e: Ref): VerseLine[] {
  const db = getDb();
  const lines: VerseLine[] = [];

  // normalize order
  let a = s;
  let b = e;
  if (
    a.chapter > b.chapter ||
    (a.chapter === b.chapter && a.verse > b.verse)
  ) {
    a = e;
    b = s;
  }

  if (a.chapter === b.chapter) {
    const minV = Math.min(a.verse, b.verse);
    const maxV = Math.max(a.verse, b.verse);
    const stmt = db.prepare(
      'SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND chapter = ? AND number BETWEEN ? AND ? ORDER BY number'
    );
    const rows = stmt.all(a.bookId, a.chapter, minV, maxV) as VerseLine[];
    lines.push(...rows);
    return lines;
  }

  const firstStmt = db.prepare(
    'SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND chapter = ? AND number >= ? ORDER BY number'
  );
  const middleStmt = db.prepare(
    'SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY number'
  );
  const lastStmt = db.prepare(
    'SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND chapter = ? AND number <= ? ORDER BY number'
  );

  lines.push(...(firstStmt.all(a.bookId, a.chapter, a.verse) as VerseLine[]));

  if (b.chapter > a.chapter + 1) {
    for (let ch = a.chapter + 1; ch < b.chapter; ch++) {
      lines.push(...(middleStmt.all(a.bookId, ch) as VerseLine[]));
    }
  }

  lines.push(...(lastStmt.all(a.bookId, b.chapter, b.verse) as VerseLine[]));
  return lines;
}


function normalizeRefInput(ref: string) {
  let t = ref
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // ordinals / roman numerals at start
  t = t
    .replace(/^(First|1st)\s+/i, '1 ')
    .replace(/^(Second|2nd)\s+/i, '2 ')
    .replace(/^(Third|3rd)\s+/i, '3 ')
    .replace(/^(III)\s+/i, '3 ')
    .replace(/^(II)\s+/i, '2 ')
    .replace(/^(I)\s+/i, '1 ');

  // allow "1John" -> "1 John"
  t = t.replace(/^([123])(?=[A-Za-z])/,'$1 ');

  // book aliases
  t = t
    .replace(/^Psalm(\s+\d)/i, 'Psalms$1')
    .replace(/^Ps\.?\s*(\d)/i, 'Psalms $1')
    .replace(/^Revelations\b/i, 'Revelation')
    .replace(/^Song of Songs\b/i, 'Song of Solomon')
    .replace(/^Canticles\b/i, 'Song of Solomon');

  return t;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startRaw = searchParams.get('start');
  const endRaw = searchParams.get('end');

  if (!startRaw || !endRaw) {
    return NextResponse.json(
      { error: 'Missing start or end query parameters' },
      { status: 400 }
    );
  }

  const start = normalizeRefInput(startRaw);
  const end = normalizeRefInput(endRaw);

  const s = parseRef(start);
  const e = parseRef(end);

  if (!s || !e || s.bookId !== e.bookId) {
    return NextResponse.json(
      { error: `Unsupported reference: ${startRaw} – ${endRaw}` },
      { status: 400 }
    );
  }

  try {
    const lines = fetchLines(s, e);
    if (!lines.length) {
      return NextResponse.json(
        { error: 'No verses found for that reference', lines: [] },
        { status: 404 }
      );
    }
    return NextResponse.json({ lines });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to load passage from database'
      },
      { status: 500 }
    );
  }
}
