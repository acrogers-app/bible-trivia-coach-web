// Learn narrators and the rule that ties each bundled clip to its exact verse text.
// Shared by scripts/generateLearnAudio.mjs (makes clips) and scripts/validateTopics.mjs
// (checks them). Voice IDs are not secrets; the ElevenLabs API key never appears here.
import crypto from "node:crypto";

export const MODEL_ID = "eleven_multilingual_v2";
export const OUTPUT_FORMAT = "mp3_44100_64"; // mono, 64 kbps
// B30's "scripture" preset (web/lib/scriptureVoiceFormatter.js); only the speed differs.
const BASE = { stability: 0.4, similarity_boost: 0.87, style: 0.25, use_speaker_boost: true };
// Learn narrator: Sunny Singh ("Sunny Singh - Dramatic Fiction Narrator", ElevenLabs library
// voice) at speed 1.1. First entry = app default. Chosen by Allen on 2026-11-24 after a
// one-verse audition, replacing Sarah (EXAVITQu4vr4xnSDxMaL). One voice only, to save
// ElevenLabs credits (some are kept for redoing his B30 voice). George (JBFqnCBsd6RMkjVDRZzb)
// was dropped earlier. To add a voice back, add it here and run
// npm run generate:learn-audio -- --voice=<key>.
export const VOICES = {
  sunny: { label: "Sunny Singh", id: "6Bs1TaIOmMB2rR4xv0wD", settings: { ...BASE, speed: 1.1 } },
};

export const sha16 = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
// The file name covers voice, model, settings, format and the exact text, so a clip can only
// match the text it was made from.
export const clipFile = (v, text) =>
  `${sha16([v.id, MODEL_ID, JSON.stringify(v.settings), OUTPUT_FORMAT, text].join("|"))}.mp3`;

/**
 * Problems with the bundled narration for one passage, for every narrator.
 * verses: [{ ref: "Ephesians 2:1", text }]; fileExists(name) -> boolean.
 */
export function passageAudioProblems(manifest, verses, fileExists, voices = VOICES) {
  const problems = [];
  for (const [key, v] of Object.entries(voices)) {
    const set = manifest?.voices?.[key]?.verses ?? {};
    const missing = [], stale = [];
    for (const { ref, text } of verses) {
      const e = set[ref];
      if (!e || !fileExists(e.file)) missing.push(ref);
      else if (e.file !== clipFile(v, text) || e.chars !== text.length) stale.push(ref);
    }
    if (missing.length) problems.push(`${v.label} audio missing for ${missing.join(", ")}`);
    if (stale.length) problems.push(`${v.label} audio does not match the current WEB text for ${stale.join(", ")}`);
  }
  return problems;
}
