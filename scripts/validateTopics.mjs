// Validates Learn content. Wired into `npm run check` via `npm run validate:topics`.
//
// Errors (exit 1):
//  - schema problems, duplicate ids, unknown related topics
//  - a Scripture reference that does not exist in db/web.sqlite (World English Bible)
//  - a question id that does not exist in the trivia pack
//  - REVIEW GATE: any lesson in the shipped file (public/data/topics_en_v1.json) that is not
//    review.status "approved" with the approver (internal record, never shown in the app) and approval date. Drafts belong in
//    content/learn/drafts/ (never bundled) or the preview fixture.
//  - an approved lesson without CHECK_SIZE (5) resolvable questions (the pass rule is never shrunk)
//  - wording that implies pressure, loss, or a measure of faith
//  - AUDIO GATE: an approved lesson whose passage is missing bundled narration for any Learn
//    narrator (scripts/learnVoices.mjs), or whose clips were made from different text
//    (drafts: warning only). Fix with `npm run generate:learn-audio`.
// Warnings: content gaps (topics with no approved lessons; draft lessons short of 5 questions).
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { passageAudioProblems } from "./learnVoices.mjs";

const CHECK_SIZE = 5;
const SHIPPED = "public/data/topics_en_v1.json";
const PREVIEW = "content/learn/preview.json";
const DRAFTS_DIR = "content/learn/drafts";
const PACK = "public/packs/trivia_core_en_v1.json";
const AUDIO_MANIFEST = "public/data/learn_audio_en_v1.json";
const AUDIO_DIR = "public/audio/learn";
const TYPES = new Set(["theme", "person", "book"]);
const STATUSES = new Set(["draft", "approved"]);
// Learn must not pressure learners or tie results to faith or God's approval.
const BANNED = [
  /\bat risk\b/i, /\blose (your|all)\b/i, /\blost progress\b/i, /\bfailed\b/i, /\bstreak\b/i,
  /\bspiritual (maturity|level|score)\b/i, /\bfaith (level|score)\b/i, /\bGod rewards\b/i,
  /\bleaderboard\b/i, /\breviewed by\b/i,
];

const BOOKS = ["genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles","ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi","matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon","hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"];

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const db = new Database(path.join(process.cwd(), "db", "web.sqlite"), { readonly: true });
const verseExists = db.prepare("SELECT 1 FROM verses WHERE book_id = ? AND chapter = ? AND number = ?");
const verseRows = db.prepare(
  "SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND (chapter * 1000 + number) BETWEEN ? AND ? ORDER BY chapter, number",
);
const audioManifest = fs.existsSync(AUDIO_MANIFEST) ? JSON.parse(fs.readFileSync(AUDIO_MANIFEST, "utf8")) : {};
const audioFileExists = (name) => typeof name === "string" && fs.existsSync(path.join(AUDIO_DIR, name));
function parseRef(s) {
  const m = typeof s === "string" && s.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOKS.indexOf(m[1].toLowerCase().replace(/\s+/g, " ")) + 1;
  return bookId ? { book: m[1], bookId, chapter: +m[2], verse: +m[3] } : null;
}

const bank = new Set(JSON.parse(fs.readFileSync(PACK, "utf8")).questions.map((q) => q.id));

function scanWording(file, where, text) {
  if (typeof text !== "string") return;
  for (const re of BANNED) if (re.test(text)) err(file, `${where}: wording not allowed in Learn (${re})`);
}

function validateFile(file, { shipped }) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return err(file, `cannot read JSON (${e.message})`);
  }
  if (data.version !== 1 || !Array.isArray(data.topics)) return err(file, "expected { version: 1, topics: [] }");

  const topicIds = new Set();
  const lessonIds = new Set();
  for (const t of data.topics) {
    const tw = `topic ${t?.id ?? "?"}`;
    if (!t?.id || topicIds.has(t.id)) err(file, `${tw}: missing or duplicate id`);
    topicIds.add(t.id);
    if (!t.title) err(file, `${tw}: missing title`);
    if (!TYPES.has(t.type)) err(file, `${tw}: type must be theme, person or book`);
    if (!Array.isArray(t.lessons)) { err(file, `${tw}: lessons must be an array`); continue; }
    scanWording(file, `${tw} title/summary`, `${t.title} ${t.summary ?? ""}`);

    let approvedCount = 0;
    for (const l of t.lessons) {
      const lw = `${tw} / lesson ${l?.id ?? "?"}`;
      if (!l?.id || lessonIds.has(l.id)) err(file, `${lw}: missing or duplicate id`);
      lessonIds.add(l.id);
      if (!l.title) err(file, `${lw}: missing title`);
      if (!l.explanation) err(file, `${lw}: missing explanation`);
      for (const k of ["title", "explanation", "reflectPrompt"]) scanWording(file, `${lw} ${k}`, l[k]);
      scanWording(file, `${lw} deeper`, l.deeper?.text);

      const status = l.review?.status;
      if (!STATUSES.has(status)) err(file, `${lw}: review.status must be draft or approved`);
      const approved = status === "approved";
      if (approved) {
        approvedCount++;
        if (!l.review.reviewer || !l.review.reviewedAt) err(file, `${lw}: approved lessons need review.reviewer (the approver; internal only) and review.reviewedAt`);
      }
      if (shipped && !approved) err(file, `${lw}: REVIEW GATE — only approved lessons may ship. Keep drafts in ${DRAFTS_DIR}/.`);

      if (!Array.isArray(l.passages) || l.passages.length === 0) err(file, `${lw}: needs at least one Scripture passage`);
      for (const p of l.passages ?? []) {
        const a = parseRef(p?.start), b = parseRef(p?.end);
        if (!a || !b) { err(file, `${lw}: unreadable reference ${p?.start} – ${p?.end}`); continue; }
        if (a.bookId !== b.bookId) err(file, `${lw}: a passage must stay within one book (${p.start} – ${p.end})`);
        for (const r of [a, b]) if (!verseExists.get(r.bookId, r.chapter, r.verse)) err(file, `${lw}: reference not found in the World English Bible (${p.start} – ${p.end})`);
        if (a.bookId === b.bookId) {
          const verses = verseRows.all(a.bookId, a.chapter * 1000 + a.verse, b.chapter * 1000 + b.verse)
            .map((r) => ({ ref: `${a.book} ${r.chapter}:${r.verse}`, text: r.text }));
          for (const problem of passageAudioProblems(audioManifest, verses, audioFileExists)) {
            const msg = `${lw}: AUDIO GATE — ${problem}. Run npm run generate:learn-audio`;
            if (approved) err(file, msg);
            else warn(file, msg);
          }
        }
      }

      const ids = Array.isArray(l.questionIds) ? l.questionIds : [];
      const missing = ids.filter((id) => !bank.has(id));
      if (missing.length) err(file, `${lw}: unknown question ids ${missing.join(", ")}`);
      const usable = ids.length - missing.length;
      if (usable < CHECK_SIZE) {
        const msg = `${lw}: CONTENT GAP — ${usable} of ${CHECK_SIZE} check questions; needs ${CHECK_SIZE - usable} more approved question(s)`;
        if (approved) err(file, msg);
        else warn(file, msg);
      }
    }
    if (shipped && approvedCount === 0) warn(file, `${tw}: CONTENT GAP — no approved lessons yet (topic stays hidden)`);
  }
  for (const t of data.topics) for (const r of t.relatedTopicIds ?? []) if (!topicIds.has(r)) err(file, `topic ${t.id}: unknown related topic "${r}"`);
}

validateFile(SHIPPED, { shipped: true });
if (fs.existsSync(PREVIEW)) validateFile(PREVIEW, { shipped: false });
if (fs.existsSync(DRAFTS_DIR)) {
  for (const f of fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("._"))) {
    validateFile(path.join(DRAFTS_DIR, f), { shipped: false });
  }
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.error(`ERROR    ${e}`);
console.log(`\nLearn content: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
