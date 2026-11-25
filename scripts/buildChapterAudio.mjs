// Bundles recorded whole-chapter narration (Sunny Singh) into the app for the Read page.
// Pilot: the Gospel of Mark only (content/learn/AUDIO_PLAN.md).
//
//   node scripts/buildChapterAudio.mjs [clipDir]
//
// clipDir (default content/learn/audio-tests/mark-sunny) holds one clip per verse, named
// mark-<ch>-<v>.mp3, made at authoring time from the WEB text in db/web.sqlite. No API
// calls here; nothing is generated.
//
// Output:
//   public/audio/chapters/<hash>.mp3        one file per verse; <hash> covers the voice,
//                                           model, settings, format and exact verse text
//                                           (clipFile in learnVoices.mjs), so changed text can
//                                           never play stale audio.
//   public/data/chapter_audio_en_v1.json    { voice, label, chapters: { "Mark 1": [ { v, text, file } ] } }
// The verse text is included so a narrated chapter reads and plays offline.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { VOICES, clipFile } from "./learnVoices.mjs";

const BOOK = { name: "Mark", id: 41, chapters: 16, prefix: "mark" };
const clipDir = process.argv[2] || "content/learn/audio-tests/mark-sunny";
const OUT_DIR = "public/audio/chapters";
const MANIFEST = "public/data/chapter_audio_en_v1.json";
const voiceKey = "sunny";
const v = VOICES[voiceKey];
const pad = (n) => String(n).padStart(2, "0");

const db = new Database("db/web.sqlite", { readonly: true });
const rows = db
  .prepare("select chapter, number, text from verses where book_id = ? order by chapter, number")
  .all(BOOK.id);

fs.mkdirSync(OUT_DIR, { recursive: true });
const chapters = {};
const missing = [];
const keep = new Set();
for (const r of rows) {
  const text = r.text.trim();
  const src = path.join(clipDir, `${BOOK.prefix}-${pad(r.chapter)}-${pad(r.number)}.mp3`);
  if (!fs.existsSync(src)) { missing.push(`${r.chapter}:${r.number}`); continue; }
  const file = clipFile(v, text);
  keep.add(file);
  const dest = path.join(OUT_DIR, file);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  (chapters[`${BOOK.name} ${r.chapter}`] ??= []).push({ v: r.number, text, file });
}
if (missing.length) {
  console.error(`Missing clips for ${BOOK.name} ${missing.join(", ")}. Nothing written.`);
  process.exit(1);
}
// Remove clips no longer referenced (e.g. after a text or settings change).
for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith(".mp3") && !keep.has(f)) fs.rmSync(path.join(OUT_DIR, f));

fs.writeFileSync(MANIFEST, JSON.stringify({ voice: voiceKey, label: v.label, chapters }) + "\n");
const bytes = [...keep].reduce((a, f) => a + fs.statSync(path.join(OUT_DIR, f)).size, 0);
console.log(`${BOOK.name}: ${Object.keys(chapters).length} chapters, ${keep.size} clips, ${(bytes / 1e6).toFixed(1)} MB -> ${OUT_DIR}, ${MANIFEST}`);
