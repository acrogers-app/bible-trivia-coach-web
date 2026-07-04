import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type QuizAnswerEvent = {
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

type QuizAnalyticsPayload = {
  sessionId: string;
  quizTitle: string;
  total:     number;
  correct:   number;
  answers:   QuizAnswerEvent[];
  timestamp: string;
};

function extractBook(ref: string): string {
  const m = String(ref || '').match(/^(.+?)\s+\d+:\d+$/);
  return m ? m[1] : 'unknown';
}

async function logToLangfuse(payload: QuizAnalyticsPayload) {
  const pk  = process.env.LANGFUSE_PUBLIC_KEY;
  const sk  = process.env.LANGFUSE_SECRET_KEY;
  const url = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

  if (!pk || !sk) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[analytics:dev]', {
        session: payload.sessionId,
        title:   payload.quizTitle,
        score:   `${payload.correct}/${payload.total}`,
        wrong: payload.answers.filter(a => !a.correct).map(a => a.questionId),
      });
    }
    return;
  }

  const { Langfuse } = await import('langfuse');
  const lf = new Langfuse({ publicKey: pk, secretKey: sk, baseUrl: url });

  const scorePct = payload.total > 0
    ? Math.round((payload.correct / payload.total) * 100) : 0;

  const trace = lf.trace({
    name: 'quiz-session', id: payload.sessionId, sessionId: payload.sessionId,
    tags: [payload.quizTitle],
    metadata: { quizTitle: payload.quizTitle, total: payload.total,
                correct: payload.correct, scorePct, timestamp: payload.timestamp },
  });

  trace.score({ name: 'score-pct',
    value:   payload.correct / Math.max(payload.total, 1),
    comment: `${payload.correct}/${payload.total} correct (${scorePct}%)`,
  });

  for (const ans of payload.answers) {
    const book    = extractBook(ans.refStart);
    const chapter = ans.refStart?.match(/\s(\d+):/)?.[1] ?? '?';

    const span = trace.span({
      name: 'question',
      metadata: { questionId: ans.questionId, questionText: ans.questionText,
                  difficulty: ans.difficulty, refStart: ans.refStart,
                  refEnd: ans.refEnd, sourceType: ans.sourceType,
                  book, chapter, selectedText: ans.selectedText,
                  correctText: ans.correctText },
    });

    span.score({
      name: 'correct', value: ans.correct ? 1 : 0,
      comment: ans.correct ? 'correct' : `wrong — chose: "${ans.selectedText}"`,
    });
    span.end();
  }

  await lf.flushAsync();
}


const MAX_ANSWERS = 50;
const MAX_STRING_LENGTH = 256;
const MAX_BODY_BYTES = 128 * 1024;

function capString(value: unknown, max = MAX_STRING_LENGTH): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function invalidPayload() {
  return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
}

function sanitizePayload(body: unknown): QuizAnalyticsPayload | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const sessionId = capString(b.sessionId);
  if (!sessionId) return null;
  if (!Array.isArray(b.answers) || b.answers.length > MAX_ANSWERS) return null;

  const answers: QuizAnswerEvent[] = [];
  for (const raw of b.answers) {
    if (typeof raw !== 'object' || raw === null) return null;
    const a = raw as Record<string, unknown>;
    answers.push({
      questionId: capString(a.questionId),
      questionText: capString(a.questionText),
      correct: a.correct === true,
      selectedText: capString(a.selectedText),
      correctText: capString(a.correctText),
      difficulty: capString(a.difficulty),
      refStart: capString(a.refStart),
      refEnd: capString(a.refEnd),
      sourceType: capString(a.sourceType),
    });
  }

  const total = Number(b.total);
  const correct = Number(b.correct);

  return {
    sessionId,
    quizTitle: capString(b.quizTitle),
    total: Number.isFinite(total) ? Math.min(Math.max(total, 0), 1000) : 0,
    correct: Number.isFinite(correct) ? Math.min(Math.max(correct, 0), 1000) : 0,
    answers,
    timestamp: capString(b.timestamp),
  };
}

export async function POST(req: NextRequest) {
  // Reject declared-oversized bodies before reading them.
  const declaredSize = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    return invalidPayload();
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return invalidPayload();
  }

  // Enforce size cap on actual bytes (not characters).
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > MAX_BODY_BYTES) return invalidPayload();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalidPayload();
  }

  const payload = sanitizePayload(parsed);
  if (!payload) return invalidPayload();

  try {
    await logToLangfuse(payload);
    return NextResponse.json({ ok: true, logged: payload.answers.length });
  } catch (err) {
    console.error('[analytics]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, skipped: true });
  }
}

