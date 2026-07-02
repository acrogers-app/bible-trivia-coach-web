/**
 * Analytics — fire-and-forget, never throws, respects user opt-out.
 * No PII. Only questionId, correct/wrong, difficulty, refs.
 */
import { loadSettings } from './appSettings';

export type QuizAnswerEvent = {
  questionId:   string;
  questionText: string;
  correct:      boolean;
  selectedText: string;
  correctText:  string;
  difficulty:   string;
  refStart:     string;
  refEnd:       string;
  sourceType:   string;
};

export type QuizAnalyticsPayload = {
  sessionId: string;
  quizTitle: string;
  total:     number;
  correct:   number;
  answers:   QuizAnswerEvent[];
  timestamp: string;
};

export function makeSessionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function sendQuizAnalytics(payload: QuizAnalyticsPayload): void {
  try {
    if (typeof window === 'undefined') return;
    const settings = loadSettings();
    if (settings.analyticsEnabled === false) return;

    // Fire-and-forget — keepalive ensures delivery even during page navigation
    fetch('/api/analytics', {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body:      JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must NEVER break the app
  }
}
