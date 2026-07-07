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
const ordinal = (n) => `December ${n}`;

// ---- Interactive quiz (single self-contained file) ----

function interactiveQuizHtml() {
  const questions = pack.questions.map((q) => ({
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation || "",
    ref:
      q.refStart +
      (q.refEnd && q.refEnd !== q.refStart ? ` – ${q.refEnd}` : ""),
  }));
  // <-escape so embedded JSON can never close the script tag
  const data = JSON.stringify(questions).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Advent Bible Trivia 2026</title>
<style>
  :root {
    --navy: #14213d;
    --navy-deep: #0d1b2e;
    --gold: #e9c46a;
    --gold-deep: #c9a227;
    --ink: #1f2937;
    --line: #d1d5db;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    background: linear-gradient(180deg, var(--navy-deep), var(--navy) 40%, #1d3557);
    color: #fff;
    min-height: 100vh;
  }
  .wrap { max-width: 560px; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  header { text-align: center; padding: .75rem 0 .25rem; }
  h1 { color: var(--gold); font-size: 1.45rem; margin: 0; letter-spacing: .02em; }
  .tagline { color: #cbd5e1; font-style: italic; font-size: .9rem; margin: .3rem 0 0; }
  .meter-row {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: .9rem; color: #e2e8f0; margin: 1.1rem 0 .4rem;
  }
  .bar {
    height: 10px; background: rgba(255,255,255,.15);
    border-radius: 999px; overflow: hidden;
  }
  .bar > div {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, var(--gold-deep), var(--gold));
    border-radius: 999px; transition: width .4s ease;
  }
  .card {
    background: #fff; color: var(--ink); border-radius: 16px;
    padding: 1.25rem 1.15rem; margin-top: 1rem;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
  }
  .qref { color: #6b7280; font-size: .82rem; margin: 0 0 .4rem; }
  .qtext { font-size: 1.12rem; font-weight: 700; margin: 0 0 1rem; line-height: 1.45; }
  button.opt {
    display: flex; align-items: center; gap: .7rem; width: 100%;
    text-align: left; padding: .85rem .9rem; margin: .5rem 0;
    border-radius: 12px; border: 2px solid var(--line); background: #fff;
    font: inherit; font-size: 1rem; color: var(--ink);
    cursor: pointer; min-height: 3.2rem;
    transition: background-color .15s ease, border-color .15s ease, transform .08s ease;
  }
  button.opt:not(:disabled):hover { border-color: var(--gold-deep); background: #fffbeb; }
  button.opt:not(:disabled):active { transform: scale(.98); }
  button.opt:disabled { cursor: default; }
  .badge {
    flex-shrink: 0; width: 1.7rem; height: 1.7rem; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--navy); color: var(--gold);
    font-size: .85rem; font-weight: 700;
  }
  .opt.correct { background: #dcfce7; border-color: #16a34a; }
  .opt.correct .badge { background: #16a34a; color: #fff; }
  .opt.wrong { background: #fee2e2; border-color: #dc2626; }
  .opt.wrong .badge { background: #dc2626; color: #fff; }
  .feedback { margin-top: 1rem; border-top: 1px solid #e5e7eb; padding-top: .9rem; }
  .verdict { font-weight: 700; font-size: 1.02rem; margin: 0 0 .35rem; }
  .verdict.good { color: #15803d; }
  .verdict.miss { color: #b45309; }
  .explain { font-size: .95rem; margin: 0; color: #374151; line-height: 1.5; }
  .fbref { font-size: .82rem; color: #6b7280; margin: .45rem 0 0; }
  .nextrow { text-align: right; margin-top: 1.1rem; }
  button.next {
    font: inherit; font-weight: 700; font-size: 1rem;
    background: var(--gold); color: var(--navy);
    border: none; border-radius: 999px; padding: .75rem 1.4rem;
    cursor: pointer; transition: transform .08s ease, background-color .15s ease;
  }
  button.next:hover { background: #f0d182; }
  button.next:active { transform: scale(.97); }
  .final { text-align: center; padding: 1.5rem 1rem 2rem; }
  .final .stars { font-size: 2.6rem; margin: 0; }
  .final h2 { color: var(--gold); font-size: 1.5rem; margin: .5rem 0; }
  .final .score { font-size: 1.15rem; color: #fff; margin: .25rem 0 1rem; }
  .final p { color: #e2e8f0; line-height: 1.55; }
  a.cta {
    display: inline-block; margin-top: 1rem; text-decoration: none;
    background: var(--gold); color: var(--navy); font-weight: 700;
    border-radius: 999px; padding: .8rem 1.5rem;
  }
  a.cta:hover { background: #f0d182; }
  footer { text-align: center; font-size: .8rem; color: #94a3b8; margin-top: 2rem; }
  @media (min-width: 640px) {
    h1 { font-size: 1.7rem; }
    .qtext { font-size: 1.2rem; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>&#10024; Advent Bible Trivia 2026</h1>
    <p class="tagline">25 days through the Christmas story</p>
  </header>

  <div id="quiz">
    <div class="meter-row">
      <span id="counter"></span>
      <span id="score"></span>
    </div>
    <div class="bar"><div id="fill"></div></div>

    <div class="card">
      <p class="qref" id="qref"></p>
      <p class="qtext" id="qtext"></p>
      <div id="opts"></div>
      <div class="feedback" id="feedback" hidden>
        <p class="verdict" id="verdict"></p>
        <p class="explain" id="explain"></p>
        <p class="fbref" id="fbref"></p>
      </div>
    </div>
    <div class="nextrow">
      <button class="next" id="next" hidden></button>
    </div>
  </div>

  <div class="final" id="final" hidden>
    <p class="stars">&#127775;&#127876;&#10024;</p>
    <h2>You made it to Christmas!</h2>
    <p class="score" id="finalScore"></p>
    <p>From Isaiah's promise to the Word made flesh &mdash; you've walked the
       whole story. May it dwell in you richly this season.</p>
    <p style="font-size:.9rem">Hungry for more? Bible Trivia Coach has free
       daily readings and quizzes all year round.</p>
    <a class="cta" href="https://bible-trivia-coach-web.vercel.app">Keep playing free &rarr;</a>
  </div>

  <footer>Bible Trivia Coach &middot; May God's Word dwell in you richly. (Colossians 3:16)</footer>
</div>

<script>
var QUESTIONS = ${data};
var i = 0, score = 0, answered = false;
var $ = function (id) { return document.getElementById(id); };

function show() {
  var q = QUESTIONS[i];
  $('counter').textContent = 'Question ' + (i + 1) + ' of ' + QUESTIONS.length;
  $('score').textContent = 'Score: ' + score;
  $('fill').style.width = (i / QUESTIONS.length) * 100 + '%';
  $('qref').textContent = q.ref;
  $('qtext').textContent = q.text;
  var opts = $('opts');
  opts.innerHTML = '';
  q.options.forEach(function (opt, j) {
    var b = document.createElement('button');
    b.className = 'opt';
    var badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'ABCD'[j];
    var label = document.createElement('span');
    label.textContent = opt;
    b.appendChild(badge);
    b.appendChild(label);
    b.onclick = function () { pick(j, b); };
    opts.appendChild(b);
  });
  $('feedback').hidden = true;
  $('next').hidden = true;
  answered = false;
  window.scrollTo(0, 0);
}

function pick(j, btn) {
  if (answered) return;
  answered = true;
  var q = QUESTIONS[i];
  var buttons = document.querySelectorAll('.opt');
  buttons.forEach(function (b) { b.disabled = true; });
  buttons[q.correctIndex].classList.add('correct');
  if (j === q.correctIndex) {
    score++;
    $('verdict').textContent = "\\u2713 That's right!";
    $('verdict').className = 'verdict good';
  } else {
    btn.classList.add('wrong');
    $('verdict').textContent = 'Not quite \\u2014 the right answer is highlighted.';
    $('verdict').className = 'verdict miss';
  }
  $('score').textContent = 'Score: ' + score;
  $('explain').textContent = q.explanation;
  $('fbref').textContent = q.ref;
  $('feedback').hidden = false;
  $('fill').style.width = ((i + 1) / QUESTIONS.length) * 100 + '%';
  $('next').textContent = i === QUESTIONS.length - 1
    ? 'See your results \\u2192'
    : 'Next Question \\u2192';
  $('next').hidden = false;
}

$('next').onclick = function () {
  i++;
  if (i >= QUESTIONS.length) {
    $('quiz').hidden = true;
    $('final').hidden = false;
    $('finalScore').textContent =
      'You answered ' + score + ' of ' + QUESTIONS.length + ' correctly.';
    window.scrollTo(0, 0);
  } else {
    show();
  }
};

show();
</script>
</body>
</html>`;
}

// ---- Answer key (printable reference) ----

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

const keyBody =
  `<div class="howto"><h2>Answer Key</h2>
  <p>Each card shows the correct answer and a short explanation anchored in the
     passage itself. Handy for family or group settings &mdash; and printable.</p></div>` +
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

  Advent-2026-Daily-Quiz.html   The interactive quiz — open it in any web
                                browser (phone or computer). One question
                                at a time with instant feedback, a progress
                                bar, and a little celebration at the end.
                                Works completely offline.
  Advent-2026-Answer-Key.html   All answers with short, Scripture-anchored
                                explanations. Printable — great for family
                                or group settings.
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
Open Advent-2026-Daily-Quiz.html and tap an answer — you'll see right away
whether you got it, plus the Scripture reference and a short explanation.
Do one a day through December, or take the whole journey in one sitting.

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
An interactive Bible trivia quiz — one question a day from December 1–25,
walking your family through the whole Christmas story, from Isaiah's
prophecies to the manger to "the Word became flesh."

**Description:**
Make Scripture stick this Advent — one small, joyful question at a time.

This interactive quiz gives you one multiple-choice question for each day
of December leading up to Christmas. Tap an answer and see instantly
whether you got it, with the Scripture reference and a short explanation
anchored in the text — no trick questions, no speculative theology.
Works on any phone or computer, completely offline.

The questions follow the story in order:

- Ancient prophecy — Isaiah 7 & 9, Micah 5
- The announcements — Matthew 1, Luke 1
- The birth in Bethlehem — Luke 2
- The wise men — Matthew 2
- The Word made flesh — John 1

**What you get:**
- Interactive quiz (HTML — opens in any browser, works offline, with
  progress bar, instant feedback, and a celebration at the end)
- Printable answer key with explanations
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
  interactiveQuizHtml()
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
