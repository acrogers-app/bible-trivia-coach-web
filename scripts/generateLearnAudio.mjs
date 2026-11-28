// Generates recorded narration (ElevenLabs) for each verse of each Learn lesson passage, in
// every Learn narrator voice (scripts/learnVoices.mjs), and bundles it in the app.
//
// Runs at authoring time on Allen's Mac only. The app never calls ElevenLabs.
//
//   ELEVENLABS_API_KEY=… node scripts/generateLearnAudio.mjs content/learn/drafts/grace.json
//   node scripts/generateLearnAudio.mjs --dry-run content/learn/drafts/grace.json   (no API calls)
//   add --play to hear the passage verse by verse afterwards (macOS afplay)
//   add --voice=<key> to do one narrator only
//
// With no file arguments it uses public/data/topics_en_v1.json (approved lessons).
// The API key is read from the environment and is never written or printed.
//
// Output:
//   public/audio/learn/<hash>.mp3      one file per verse; <hash> covers the voice, model,
//                                      settings, format and exact verse text, so unchanged
//                                      verses are never re-generated (no credits spent) and
//                                      changed text can never play stale audio.
//   public/data/learn_audio_en_v1.json manifest:
//     { voices: { <voice>: { label, model, settings, format,
//                            verses: { "<Book> <ch>:<v>": { file, chars, textSha, bytes } } } } }
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { MODEL_ID, OUTPUT_FORMAT, VOICES, clipFile, sha16 } from "./learnVoices.mjs";

const AUDIO_DIR = "public/audio/learn";
const MANIFEST = "public/data/learn_audio_en_v1.json";
const BOOKS = ["genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles","ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi","matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon","hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation"];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const play = args.includes("--play");
const only = args.find((a) => a.startsWith("--voice="))?.slice(8);
if (only && !VOICES[only]) { console.error(`Unknown voice ${only}. Use: ${Object.keys(VOICES).join(", ")}`); process.exit(1); }
const sources = args.filter((a) => !a.startsWith("--"));
if (!sources.length) sources.push("public/data/topics_en_v1.json");
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!dryRun && !apiKey) {
  console.error("ELEVENLABS_API_KEY is not set. Set it in this terminal only, or use --dry-run.");
  process.exit(1);
}

function parseRef(s) {
  const m = String(s).trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookId = BOOKS.indexOf(m[1].toLowerCase().replace(/\s+/g, " ")) + 1;
  return bookId ? { book: m[1], bookId, chapter: +m[2], verse: +m[3] } : null;
}


const db = new Database(path.join(process.cwd(), "db", "web.sqlite"), { readonly: true });
const rows = db.prepare(
  "SELECT chapter, number AS verse, text FROM verses WHERE book_id = ? AND (chapter * 1000 + number) BETWEEN ? AND ? ORDER BY chapter, number",
);

// Collect every verse of every lesson passage in the given lesson files.
const verses = new Map(); // "Ephesians 2:1" -> text
for (const file of sources) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const topic of data.topics ?? []) {
    for (const lesson of topic.lessons ?? []) {
      for (const p of lesson.passages ?? []) {
        const a = parseRef(p.start);
        const b = parseRef(p.end);
        if (!a || !b || a.bookId !== b.bookId) throw new Error(`${file}: bad passage ${p.start} – ${p.end}`);
        for (const r of rows.all(a.bookId, a.chapter * 1000 + a.verse, b.chapter * 1000 + b.verse)) {
          verses.set(`${a.book} ${r.chapter}:${r.verse}`, r.text);
        }
      }
    }
  }
}

fs.mkdirSync(AUDIO_DIR, { recursive: true });
const old = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
// Voices no longer in VOICES are dropped from the manifest (delete their files by hand).
const manifest = { voices: Object.fromEntries(Object.entries(old.voices ?? {}).filter(([k]) => VOICES[k])) };

let made = 0, reused = 0, credits = 0;
for (const [key, v] of Object.entries(VOICES)) {
  if (only && key !== only) continue;
  const entry = (manifest.voices[key] = {
    label: v.label, model: MODEL_ID, settings: v.settings, format: OUTPUT_FORMAT, voiceId: v.id,
    verses: manifest.voices[key]?.verses ?? {},
  });
  for (const [ref, text] of verses) {
    const file = clipFile(v, text);
    const out = path.join(AUDIO_DIR, file);
    if (fs.existsSync(out)) {
      reused++;
    } else if (dryRun) {
      credits += text.length;
      console.log(`would generate ${v.label} ${ref} (${text.length} chars) -> ${out}`);
      continue;
    } else {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=${OUTPUT_FORMAT}`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: v.settings }),
        },
      );
      if (!res.ok) {
        console.error(`ElevenLabs ${res.status} for ${v.label} ${ref}: ${(await res.text()).slice(0, 300)}`);
        process.exit(1);
      }
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      made++;
      credits += text.length;
      console.log(`generated ${v.label} ${ref} -> ${out}`);
    }
    entry.verses[ref] = { file, chars: text.length, textSha: sha16(text), bytes: fs.statSync(out).size };
  }
}

if (!dryRun) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${verses.size} verses: ${made} clips generated, ${reused} already present, ~${credits} credits ${dryRun ? "would be used" : "used"}.`);

if (play && !dryRun) {
  for (const [key, v] of Object.entries(VOICES)) {
    if (only && key !== only) continue;
    for (const ref of verses.keys()) {
      console.log(`playing ${v.label} ${ref}`);
      spawnSync("afplay", [path.join(AUDIO_DIR, manifest.voices[key].verses[ref].file)], { stdio: "inherit" });
    }
  }
}
