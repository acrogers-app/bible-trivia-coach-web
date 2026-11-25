// Shared speech-synthesis helpers. ALWAYS route TTS teardown through
// stopSpeech() — any code path that advances a question, leaves a screen, or
// unmounts a component with TTS must call it, or speech keeps playing over
// the next screen (the v1.2.0 "TTS keeps reading on Next" bug).

export function stopSpeech() {
  if (
    typeof window !== 'undefined' &&
    window.speechSynthesis &&
    (window.speechSynthesis.speaking || window.speechSynthesis.pending)
  ) {
    window.speechSynthesis.cancel();
  }
}

/** Simple one-shot speech for short texts (settings samples etc.).
 *  Rich passage reading (voice pick + word highlighting) stays in
 *  PassageInline/DailyReadingScreen — those must still call stopSpeech()
 *  on every exit path. */
export function speakText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Always stop existing speech first
  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  if (onEnd) utterance.onend = onEnd;

  // Small delay prevents a Chrome bug where speak() right after cancel()
  // gets cancelled immediately
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 100);
}

// ---------------------------------------------------------------------------
// Voice choice for passage reading (used by Learn Listen).
// Same ranking as the Settings "Auto (best: …)" voice, plus a quality tier so
// installed Premium/Enhanced Apple voices win over compact ones, and novelty /
// legacy voices are never picked automatically. The user's saved Settings
// voice (readerVoiceURI) always wins when it is installed.

function primaryLang(tag: string) {
  return (tag || '').toLowerCase().split('-')[0] || '';
}

const NOVELTY_NAMES = [
  'bad news', 'good news', 'bahh', 'bark', 'woof', 'dog', 'cellos', 'organ', 'bells',
  'wobble', 'boing', 'whisper', 'robot', 'jester', 'superstar', 'trinoids', 'zarvox',
  'sound', 'effect', 'grandma', 'grandpa', 'albert', 'bubbles',
];

/** Novelty / sound-effect voices. Never chosen automatically. */
export function isNoveltyVoice(v: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>) {
  const n = (v.name || '').toLowerCase();
  const id = (v.voiceURI || '').toLowerCase();
  return NOVELTY_NAMES.some((x) => n.includes(x)) ||
    ['hysterical', 'princess', 'deranged'].some((x) => id.endsWith(`.${x}`));
}

/** 3 = Premium, 2 = Enhanced, 1 = standard/compact, 0 = old MacinTalk voice (Fred, Ralph…). */
export function voiceQualityTier(v: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>) {
  const id = (v.voiceURI || '').toLowerCase();
  const n = (v.name || '').toLowerCase();
  if (id.includes('.premium.') || n.includes('premium')) return 3;
  if (id.includes('.enhanced.') || n.includes('enhanced')) return 2;
  if (id.startsWith('com.apple.speech.synthesis.voice.')) return 0;
  return 1;
}

function voiceScore(v: SpeechSynthesisVoice, targetLang: string) {
  const n = (v.name || '').toLowerCase();
  let s = voiceQualityTier(v) * 100;
  if ((v.lang || '').toLowerCase() === (targetLang || '').toLowerCase()) s += 20;
  if (primaryLang(v.lang) === primaryLang(targetLang)) s += 10;
  if (n.includes('google')) s += 80;
  if (n.includes('microsoft')) s += 55;
  if (n.includes('siri')) s += 20;
  if (n.includes('samantha')) s += 90;
  if (n.includes('alex')) s += 60;
  if (n.includes('victoria')) s += 35;
  if (v.default) s += 30;
  return s;
}

/** Best installed, non-novelty voice for a language, or null. */
export function bestVoiceFor(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const p = primaryLang(lang);
  const candidates = voices.filter((v) => v.lang && primaryLang(v.lang) === p && !isNoveltyVoice(v));
  return [...candidates].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0] || null;
}

/** The voice to read with: the saved Settings voice if installed, else the best available. */
export function pickReadingVoice(
  voices: SpeechSynthesisVoice[],
  prefs: { readerVoiceURI?: string; readerLang?: string },
): SpeechSynthesisVoice | null {
  const chosen = prefs.readerVoiceURI ? voices.find((v) => v.voiceURI === prefs.readerVoiceURI) : undefined;
  return chosen || bestVoiceFor(voices, prefs.readerLang || 'en-US');
}

/** True when an Enhanced or Premium voice for the language is installed. */
export function hasHighQualityVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const p = primaryLang(lang);
  return voices.some((v) => primaryLang(v.lang) === p && voiceQualityTier(v) >= 2);
}
