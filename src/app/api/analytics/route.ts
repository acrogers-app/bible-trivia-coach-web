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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuizAnalyticsPayload;
    if (!body?.sessionId || !Array.isArray(body.answers)) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }
    await logToLangfuse(body);
    return NextResponse.json({ ok: true, logged: body.answers.length });
  } catch (err) {
    console.error('[analytics]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, skipped: true });
  }
}
