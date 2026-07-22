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
