// Bundled narration must match the exact WEB text, for every narrator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICES, clipFile, passageAudioProblems } from '../../scripts/learnVoices.mjs';

// The app ships one narrator (Sunny Singh), but the check supports several, so most tests use a
// two-voice set to keep that covered.
const TWO = {
  ...VOICES,
  second: { label: 'Second', id: 'test-voice-id', settings: { ...VOICES.sunny.settings } },
};
const verses = [
  { ref: 'Ephesians 2:8', text: 'for by grace you have been saved through faith,' },
  { ref: 'Ephesians 2:9', text: 'not of works, that no one would boast.' },
];
const manifestFor = (vs, voices = TWO) => ({
  voices: Object.fromEntries(Object.entries(voices).map(([k, v]) => [k, {
    verses: Object.fromEntries(vs.map((x) => [x.ref, { file: clipFile(v, x.text), chars: x.text.length }])),
  }])),
});
const all = () => true;

test('the app ships exactly one narrator, Sunny Singh', () => {
  assert.deepEqual(Object.keys(VOICES), ['sunny']);
});

test('complete, current audio for every narrator passes', () => {
  assert.deepEqual(passageAudioProblems(manifestFor(verses, VOICES), verses, all), []);
  assert.deepEqual(passageAudioProblems(manifestFor(verses), verses, all, TWO), []);
});

test('a narrator with a missing verse is reported', () => {
  const m = manifestFor(verses);
  delete m.voices.second.verses['Ephesians 2:9'];
  assert.deepEqual(passageAudioProblems(m, verses, all, TWO), ['Second audio missing for Ephesians 2:9']);
});

test('a manifest entry whose file is not bundled counts as missing', () => {
  const m = manifestFor(verses, VOICES);
  const gone = m.voices.sunny.verses['Ephesians 2:8'].file;
  const problems = passageAudioProblems(m, verses, (f) => f !== gone);
  assert.deepEqual(problems, ['Sunny Singh audio missing for Ephesians 2:8']);
});

test('audio made from different text is reported as stale', () => {
  const m = manifestFor(verses);
  const changed = verses.map((v) => (v.ref === 'Ephesians 2:8' ? { ...v, text: v.text.replace('faith', 'faith!') } : v));
  const problems = passageAudioProblems(m, changed, all, TWO);
  assert.equal(problems.length, 2);
  for (const p of problems) assert.match(p, /does not match the current WEB text for Ephesians 2:8$/);
});

test('clip names change with voice settings and voice, so either change needs new audio', () => {
  const v = VOICES.sunny;
  assert.notEqual(clipFile(v, 'x'), clipFile({ ...v, settings: { ...v.settings, speed: 1.0 } }, 'x'));
  assert.notEqual(clipFile(TWO.sunny, 'x'), clipFile(TWO.second, 'x'));
});

test('an empty manifest reports every narrator missing', () => {
  assert.equal(passageAudioProblems({}, verses, all).length, 1);
  assert.equal(passageAudioProblems({}, verses, all, TWO).length, 2);
});
