import fs from 'node:fs';

const SRC = 'public/data/trivia_core_en_v1.json';
const OUT = 'public/data/trivia_core_en_v1.ambig_cleaned.json';

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const PHRASES = [
  'this song',
  'this psalm',
  'this parable',
  'this miracle',
  'this prophecy',
  'this command',
  'this law',
  'this passage',
  'this vision',
  'this story',
];

function makeRefLabel(ref) {
  if (typeof ref !== 'string') return '';
  // Grab 'Book Chapter' from something like 'Exodus 15:1–21'
  const m = ref.match(/^\s*([1-3]?\s*[A-Za-z ]+)\s+(\d+):\d+/);
  if (!m) return ref.trim();
  const book = m[1].replace(/\s+/g, ' ').trim();
  const chapter = m[2];
  return `${book} ${chapter}`;
}

let patchedCount = 0;
const patched = raw.map((q) => {
  if (!q || typeof q !== 'object' || typeof q.text !== 'string') return q;

  let text = q.text;
  const lower = text.toLowerCase();
  let changed = false;

  for (const phrase of PHRASES) {
    if (!lower.includes(phrase)) continue;
    if (!q.refStart || typeof q.refStart !== 'string') continue;

    const label = makeRefLabel(q.refStart);
    if (!label) continue;

    const re = new RegExp(`\\b${phrase}\\b`, 'gi');
    text = text.replace(re, (m) => `${m} in ${label}`);
    changed = true;
  }

  if (changed) {
    patchedCount += 1;
    return { ...q, text };
  }
  return q;
});

console.log('Total questions:', raw.length);
console.log('Questions patched for ambiguous phrases:', patchedCount);
fs.writeFileSync(OUT, JSON.stringify(patched, null, 2));
console.log('Wrote cleaned file to', OUT);
