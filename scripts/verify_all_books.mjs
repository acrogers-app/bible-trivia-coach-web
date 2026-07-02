const BASE = process.env.BASE_URL || "http://localhost:3000";

const books = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther",
  "Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel",
  "Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans",
  "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

async function check(start, end) {
  const u = new URL(BASE + "/api/passage");
  u.searchParams.set("start", start);
  u.searchParams.set("end", end);
  const res = await fetch(u);
  const data = await res.json().catch(async () => ({ raw: await res.text() }));
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  const failures = [];

  for (const b of books) {
    const start = `${b} 1:1`;
    const end = `${b} 1:1`;
    const r = await check(start, end);
    if (!r.ok || !r.data?.lines?.length) {
      failures.push({ book: b, status: r.status, err: r.data?.error || r.data?.raw });
      process.stdout.write("F");
    } else {
      process.stdout.write(".");
    }
  }
  process.stdout.write("\n");

  if (failures.length) {
    console.log("FAILURES:");
    for (const f of failures) {
      console.log(`- ${f.book}: [${f.status}] ${String(f.err).slice(0, 300)}`);
    }
    process.exit(1);
  } else {
    console.log("All 66 books passed (1:1 loads).");
  }
})();
