// Packages the Advent 2026 question pack into a Gumroad-ready zip.
// Output: generated/gumroad/ (gitignored). Run: node scripts/packageAdventGumroad.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PACK_PATH = "public/packs/advent-2026.json";
const OUT_DIR = "generated/gumroad";
const PRODUCT_DIR = path.join(OUT_DIR, "advent-2026");
const ZIP_NAME = "bible-trivia-coach-advent-2026.zip";

const pack = JSON.parse(fs.readFileSync(PACK_PATH, "utf8"));
if (pack.questions.length !== 25) {
  throw new Error(`Expected 25 questions, found ${pack.questions.length}`);
}

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const LETTERS = ["A", "B", "C", "D"];
const ordinal = (n) =>
  `December ${n}`;

const baseCss = `
  :root { --ink: #1f2937; --accent: #1d4ed8; --soft: #eef2ff; --line: #e5e7eb; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: var(--ink);
         max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem; line-height: 1.55; }
  header { text-align: center; margin-bottom: 2rem; }
  h1 { color: var(--accent); font-size: 1.9rem; margin: 0 0 .25rem; }
  .subtitle { font-style: italic; color: #4b5563; margin: 0; }
  .howto { background: var(--soft); border-radius: 12px; padding: 1rem 1.25rem; margin: 1.5rem 0; }
  .howto h2 { font-size: 1.05rem; margin: 0 0 .5rem; color: var(--accent); }
  .howto p { margin: .35rem 0; font-size: .95rem; }
  .day { border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.25rem;
         margin: 1rem 0; page-break-inside: avoid; }
  .day .date { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase;
               color: var(--accent); font-weight: 700; }
  .day .ref { font-size: .8rem; color: #6b7280; float: right; }
  .day p.q { font-size: 1.05rem; margin: .4rem 0 .6rem; }
  .day ol { list-style: none; margin: 0; padding: 0; }
  .day ol li { padding: .25rem 0; }
  .day ol li b { color: var(--accent); margin-right: .4rem; }
  .answer { background: var(--soft); border-radius: 8px; padding: .6rem .8rem; margin-top: .6rem; }
  .answer .correct { font-weight: 700; }
  .answer .why { font-size: .92rem; margin: .3rem 0 0; }
  footer { text-align: center; font-size: .85rem; color: #6b7280; margin-top: 2.5rem;
           border-top: 1px solid var(--line); padding-top: 1rem; }
  @media print {
    body { padding: 0; max-width: none; }
    .day { border-color: #bbb; }
  }
`;

function pageShell(title, subtitle, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${baseCss}</style>
</head>
<body>
<header>
  <h1>${esc(title)}</h1>
  <p class="subtitle">${esc(subtitle)}</p>
</header>
${body}
<footer>
  <p>Bible Trivia Coach &middot; bible-trivia-coach-web.vercel.app</p>
  <p>May God's Word dwell in you richly this Advent. (Colossians 3:16)</p>
</footer>
</body>
</html>`;
}

const howto = `
<div class="howto">
  <h2>How this works</h2>
  <p>One question a day, December 1&ndash;25. Read it aloud at dinner, in the car,
     or wherever your household gathers. Guess together, then look up the passage
     &mdash; the reference is on each card.</p>
  <p>Answers and short explanations are in the separate Answer Key, so nobody
     peeks by accident.</p>
  <p>Missed a day? No worries at all &mdash; just pick up wherever you are.
     The story will wait for you.</p>
</div>`;

const quizBody =
  howto +
  pack.questions
    .map((q, i) => {
      const opts = q.options
        .map((o, j) => `<li><b>${LETTERS[j]}.</b> ${esc(o)}</li>`)
        .join("\n      ");
      return `
<div class="day">
  <span class="ref">${esc(q.refStart)}</span>
  <span class="date">${ordinal(i + 1)}</span>
  <p class="q">${esc(q.text)}</p>
  <ol>
      ${opts}
  </ol>
</div>`;
    })
    .join("\n");

const keyBody =
  `<div class="howto"><h2>Answer Key</h2>
  <p>Each card shows the correct answer and a short explanation anchored in the
     passage itself. Great for reading aloud after everyone has guessed.</p></div>` +
  pack.questions
    .map((q, i) => {
      return `
<div class="day">
  <span class="ref">${esc(q.refStart)}</span>
  <span class="date">${ordinal(i + 1)}</span>
  <p class="q">${esc(q.text)}</p>
  <div class="answer">
    <span class="correct">${LETTERS[q.correctIndex]}. ${esc(q.options[q.correctIndex])}</span>
    <p class="why">${esc(q.explanation || "")}</p>
  </div>
</div>`;
    })
    .join("\n");

const readme = `Bible Trivia Coach — Advent 2026 Question Pack
================================================

Thank you for picking up this pack! Here's what's inside:

  Advent-2026-Daily-Quiz.html   One question a day, December 1–25.
                                Open in any web browser. Print-friendly.
  Advent-2026-Answer-Key.html   Answers with short, Scripture-anchored
                                explanations. Kept separate — no accidental
                                spoilers.
  advent-2026.json              The same 25 questions in machine-readable
                                form, ready for a future in-app import in
                                Bible Trivia Coach.

The journey
-----------
The 25 questions walk through the Christmas story in order:
ancient prophecy (Isaiah, Micah) → the announcements (Matthew 1, Luke 1)
→ the birth in Bethlehem (Luke 2) → the wise men (Matthew 2)
→ the Word made flesh (John 1).

How to use it
-------------
Open Advent-2026-Daily-Quiz.html in a browser and do one question a day
with your family, small group, or on your own. To print, use your
browser's Print option — each day is its own card.

No streaks, no pressure. If you miss a day, just pick up where you are.

Questions or ideas? We'd love to hear from you.
Play free daily quizzes at https://bible-trivia-coach-web.vercel.app

Personal and household use license. Please don't redistribute the files —
instead, point friends to the store page so we can keep making these.
`;

const listing = `# Gumroad listing copy — Advent 2026 pack

**Title:** Advent Bible Trivia — 25 Days Through the Christmas Story

**Suggested price:** $5 (or $3+ pay-what-you-want to maximize demand signal)

**Summary (short):**
One Bible trivia question a day from December 1–25, walking your family
through the whole Christmas story — from Isaiah's prophecies to the manger
to "the Word became flesh."

**Description:**
Make Scripture stick this Advent — one small, joyful question at a time.

This printable pack gives you one multiple-choice question for each day of
December leading up to Christmas. The questions follow the story in order:

- Ancient prophecy — Isaiah 7 & 9, Micah 5
- The announcements — Matthew 1, Luke 1
- The birth in Bethlehem — Luke 2
- The wise men — Matthew 2
- The Word made flesh — John 1

Every question includes the Scripture reference so you can look up the
passage together, and the separate answer key gives a short explanation
anchored in the text — no trick questions, no speculative theology.

**What you get:**
- Daily quiz (HTML, opens in any browser, print-friendly cards)
- Answer key with explanations
- Machine-readable JSON of all 25 questions

**Who it's for:** families at the dinner table, small groups, Sunday school
classes, or your own quiet mornings. Gentle difficulty ramp — starts easy,
grows a little more challenging as Christmas approaches. No streaks, no
guilt; miss a day and just pick back up.

From the makers of Bible Trivia Coach — free daily quizzes at
https://bible-trivia-coach-web.vercel.app
`;

fs.rmSync(PRODUCT_DIR, { recursive: true, force: true });
fs.mkdirSync(PRODUCT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(PRODUCT_DIR, "Advent-2026-Daily-Quiz.html"),
  pageShell(
    "Advent Bible Trivia 2026",
    "25 days through the Christmas story — one question at a time",
    quizBody
  )
);
fs.writeFileSync(
  path.join(PRODUCT_DIR, "Advent-2026-Answer-Key.html"),
  pageShell(
    "Advent Bible Trivia 2026 — Answer Key",
    "Answers and Scripture-anchored explanations",
    keyBody
  )
);
fs.copyFileSync(PACK_PATH, path.join(PRODUCT_DIR, "advent-2026.json"));
fs.writeFileSync(path.join(PRODUCT_DIR, "README.txt"), readme);
fs.writeFileSync(path.join(OUT_DIR, "LISTING.md"), listing);

const zipPath = path.join(OUT_DIR, ZIP_NAME);
fs.rmSync(zipPath, { force: true });
execFileSync("ditto", ["-c", "-k", "--norsrc", PRODUCT_DIR, zipPath]);

console.log("Packaged", pack.questions.length, "questions.");
console.log("Product dir:", PRODUCT_DIR);
console.log("Zip:", zipPath);
console.log("Listing copy:", path.join(OUT_DIR, "LISTING.md"));
