// Bundled chapter narration (Read page, Mark pilot) must match the exact WEB text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { VOICES, clipFile } from '../../scripts/learnVoices.mjs';

const m = JSON.parse(fs.readFileSync('public/data/chapter_audio_en_v1.json', 'utf8'));

test('chapter audio is Sunny Singh, all 16 chapters of Mark', () => {
  assert.equal(m.voice, 'sunny');
  assert.equal(m.label, 'Sunny Singh');
  assert.deepEqual(Object.keys(m.chapters), Array.from({ length: 16 }, (_, i) => `Mark ${i + 1}`));
});

test('every verse matches WEB exactly, and its clip exists and was made from that text', () => {
  const db = new Database('db/web.sqlite', { readonly: true });
  for (let c = 1; c <= 16; c++) {
    const web = db.prepare('select number v, text from verses where book_id = 41 and chapter = ? order by number').all(c);
    const got = m.chapters[`Mark ${c}`];
    assert.equal(got.length, web.length, `Mark ${c} verse count`);
    web.forEach((w, i) => {
      assert.equal(got[i].v, w.v);
      assert.equal(got[i].text, w.text.trim(), `Mark ${c}:${w.v} text`);
      assert.equal(got[i].file, clipFile(VOICES.sunny, got[i].text), `Mark ${c}:${w.v} clip name`);
      assert.ok(fs.existsSync(`public/audio/chapters/${got[i].file}`), `Mark ${c}:${w.v} clip file`);
    });
  }
});
