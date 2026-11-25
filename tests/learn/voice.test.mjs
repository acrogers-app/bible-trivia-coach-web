// Voice choice for Learn Listen (shared picker in src/lib/speech.ts).
// The base list mirrors the English voices actually installed in the iOS 26.2
// simulator (AVSpeechSynthesisVoice.speechVoices(), in WebKit's voiceURI form).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../src/lib/speech.ts';

const v = (name, lang, id, extra = {}) => ({ name, lang, voiceURI: id, default: false, localService: true, ...extra });
const SIM = [
  ['Albert', 'en-US', 'com.apple.speech.synthesis.voice.Albert'],
  ['Bad News', 'en-US', 'com.apple.speech.synthesis.voice.BadNews'],
  ['Bubbles', 'en-US', 'com.apple.speech.synthesis.voice.Bubbles'],
  ['Jester', 'en-US', 'com.apple.speech.synthesis.voice.Hysterical'],
  ['Superstar', 'en-US', 'com.apple.speech.synthesis.voice.Princess'],
  ['Wobble', 'en-US', 'com.apple.speech.synthesis.voice.Deranged'],
  ['Fred', 'en-US', 'com.apple.speech.synthesis.voice.Fred'],
  ['Ralph', 'en-US', 'com.apple.speech.synthesis.voice.Ralph'],
  ['Karen', 'en-AU', 'com.apple.voice.super-compact.en-AU.Karen'],
  ['Daniel', 'en-GB', 'com.apple.voice.super-compact.en-GB.Daniel'],
  ['Samantha', 'en-US', 'com.apple.voice.super-compact.en-US.Samantha'],
].map(([n, l, i]) => v(n, l, i));

test('never auto-picks a novelty or old robotic voice; picks Samantha on the simulator', () => {
  const best = S.bestVoiceFor(SIM, 'en-US');
  assert.equal(best.name, 'Samantha');
  for (const n of ['Albert', 'Bad News', 'Bubbles', 'Jester', 'Superstar', 'Wobble']) {
    assert.equal(S.isNoveltyVoice(SIM.find((x) => x.name === n)), true, n);
  }
  assert.equal(S.voiceQualityTier(SIM.find((x) => x.name === 'Fred')), 0);
});

test('an installed Enhanced or Premium voice beats compact ones', () => {
  const withEnhanced = [...SIM, v('Ava (Enhanced)', 'en-US', 'com.apple.voice.enhanced.en-US.Ava')];
  assert.equal(S.bestVoiceFor(withEnhanced, 'en-US').name, 'Ava (Enhanced)');
  const withPremium = [...withEnhanced, v('Zoe (Premium)', 'en-US', 'com.apple.voice.premium.en-US.Zoe')];
  assert.equal(S.bestVoiceFor(withPremium, 'en-US').name, 'Zoe (Premium)');
  assert.equal(S.hasHighQualityVoice(SIM, 'en-US'), false);
  assert.equal(S.hasHighQualityVoice(withEnhanced, 'en-US'), true);
});

test('the voice saved in Settings wins when installed, otherwise falls back to the best', () => {
  const daniel = 'com.apple.voice.super-compact.en-GB.Daniel';
  assert.equal(S.pickReadingVoice(SIM, { readerVoiceURI: daniel, readerLang: 'en-US' }).name, 'Daniel');
  assert.equal(S.pickReadingVoice(SIM, { readerVoiceURI: 'gone.voice', readerLang: 'en-US' }).name, 'Samantha');
  assert.equal(S.pickReadingVoice([], { readerLang: 'en-US' }), null);
});
