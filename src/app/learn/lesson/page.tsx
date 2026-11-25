'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CHECK_SIZE, PASS_CORRECT, selectCheckQuestions } from '../../../lib/learn/content';
import { isPassingCheck, lessonStatus, markStarted, recordCheck } from '../../../lib/learn/progress';
import { useLearnData, useLearnProgress, useNow, useUsableTopics } from '../../../lib/learn/useLearn';
import { LearnFrame, LoadingOrError, StatusChip } from '../../../components/learn/LearnChrome';
import LearnCheck from '../../../components/learn/LearnCheck';
import ScripturePassage from '../../../components/learn/ScripturePassage';
import { BODY_FS, fs } from '../../../lib/learn/textScale';

const sectionStyle = {
  marginTop: 16, padding: 14, borderRadius: 16,
  border: '1px solid var(--btc-border)', background: 'var(--btc-surface)',
} as const;
const labelStyle = { fontSize: fs(12), fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 } as const;

function LessonScreen() {
  const id = useSearchParams().get('id') ?? '';
  const { data, error } = useLearnData();
  const topics = useUsableTopics(data);
  const [progress, setProgress] = useLearnProgress();
  const now = useNow();
  const [mode, setMode] = useState<'lesson' | 'check' | 'result'>('lesson');
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstMode = useRef(true);

  // Screen readers: when the screen switches (back to the lesson, or to the result), move
  // focus to its title; the button that was pressed no longer exists. Not on first load.
  useEffect(() => {
    if (firstMode.current) { firstMode.current = false; return; }
    if (mode === 'check') return; // LearnCheck scrolls and focuses its first question
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, [mode]);

  const entry = topics.find((t) => t.lessons.some((l) => l.id === id));
  const lesson = entry?.lessons.find((l) => l.id === id);
  const status = lesson ? lessonStatus(progress, lesson.id, now) : 'not_started';

  // Opening a lesson marks it In progress (never downgrades understood progress).
  useEffect(() => {
    if (lesson && (status === 'not_started' || status === 'skipped')) {
      setProgress(markStarted(progress, lesson.id));
    }
    // Only when the lesson itself changes; progress updates must not re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  if (!data || !entry || !lesson) {
    return (
      <LearnFrame back={{ href: '/learn', label: 'Learn' }} preview={!!data?.preview}>
        {!data ? <LoadingOrError error={error} /> : <p>This lesson isn’t available yet.</p>}
      </LearnFrame>
    );
  }

  const { topic, lessons } = entry;
  const position = lessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = lessons[position + 1];
  const questions = selectCheckQuestions(lesson, data.bank);
  const back = { href: `/learn/topic?id=${encodeURIComponent(topic.id)}`, label: topic.title };
  const isReview = status === 'understood' || status === 'review_ready';

  if (mode === 'check' && questions) {
    return (
      <LearnFrame back={back} preview={data.preview}>
        <LearnCheck
          questions={questions}
          label={isReview ? `Review: ${lesson.title}` : `Check: ${lesson.title}`}
          onCancel={() => setMode('lesson')}
          onDone={(correct, total) => {
            setProgress(recordCheck(progress, lesson.id, correct, total, Date.now()));
            setResult({ correct, total });
            setMode('result');
          }}
        />
      </LearnFrame>
    );
  }

  if (mode === 'result' && result) {
    const passed = isPassingCheck(result.correct, result.total);
    return (
      <LearnFrame back={back} preview={data.preview}>
        <h1 ref={titleRef} tabIndex={-1} className="learn-h1" style={{ marginTop: 0, outline: 'none' }}>{lesson.title}</h1>
        <div role="status" style={{ ...sectionStyle, marginTop: 8 }}>
          <div style={{ fontSize: fs(18), fontWeight: 800 }}>
            {result.correct} of {result.total} correct
          </div>
          <p style={{ marginBottom: 0, fontSize: BODY_FS }}>
            {passed
              ? 'You understood this lesson’s material.'
              : `Not yet. ${PASS_CORRECT} of ${CHECK_SIZE} marks this lesson as understood. Read the passage again and try whenever you’re ready. Your progress stays saved.`}
          </p>
          {passed && (
            <p className="btc-text-muted" style={{ fontSize: fs(13), marginBottom: 0 }}>
              A short review will be ready in a few days to help it stick.
            </p>
          )}
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {passed && nextLesson && (
            <Link className="btc-btn" href={`/learn/lesson?id=${encodeURIComponent(nextLesson.id)}`} onClick={() => setMode('lesson')} style={{ textAlign: 'center', minHeight: 48, textDecoration: 'none', fontSize: fs(15), borderRadius: 24 }}>
              Next lesson: {nextLesson.title}
            </Link>
          )}
          {!passed && (
            <button type="button" className="btc-btn" onClick={() => setMode('lesson')} style={{ minHeight: 48, fontSize: fs(15), borderRadius: 24 }}>
              Back to the lesson
            </button>
          )}
          <Link className="btc-btn btc-btn-secondary" href={back.href} style={{ textAlign: 'center', minHeight: 48, textDecoration: 'none', fontSize: fs(15), borderRadius: 24 }}>
            Back to {topic.title}
          </Link>
        </div>
      </LearnFrame>
    );
  }

  return (
    <LearnFrame back={back} preview={data.preview}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span className="btc-text-muted" style={{ fontSize: fs(13) }}>
          {topic.title} · Lesson {position + 1} of {lessons.length}
        </span>
        <StatusChip status={status} />
      </div>
      <h1 ref={titleRef} tabIndex={-1} className="learn-h1" style={{ marginTop: 4, marginBottom: 0, outline: 'none' }}>{lesson.title}</h1>

      <section style={sectionStyle} aria-label="Scripture">
        <div style={labelStyle}><span aria-hidden="true">📖 </span>Scripture · World English Bible</div>
        {lesson.passages.map((p) => (
          <ScripturePassage key={`${p.start}-${p.end}`} passage={p} />
        ))}
      </section>

      <section style={sectionStyle} aria-label="Explanation">
        <div style={labelStyle}><span aria-hidden="true">💬 </span>Explanation · not Scripture</div>
        <p style={{ margin: 0, lineHeight: 1.55, fontSize: BODY_FS }}>{lesson.explanation}</p>
      </section>

      {lesson.deeper && (
        <details style={sectionStyle}>
          <summary style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer', minHeight: 44 }}><span aria-hidden="true">🔎 </span>Go deeper · explanation</summary>
          {lesson.deeper.viewsDiffer && (
            <p style={{ fontSize: fs(13), fontWeight: 700, marginBottom: 6 }}>
              Christians understand this in different ways. The notes below describe views, not a settled answer.
            </p>
          )}
          <p style={{ marginBottom: 0, lineHeight: 1.55, fontSize: BODY_FS }}>{lesson.deeper.text}</p>
        </details>
      )}

      {lesson.reflectPrompt && (
        <section style={sectionStyle} aria-label="Reflect">
          <div style={labelStyle}><span aria-hidden="true">🙏 </span>Reflect · optional</div>
          <p style={{ margin: 0, lineHeight: 1.55, fontSize: BODY_FS }}>{lesson.reflectPrompt}</p>
        </section>
      )}

      {questions && (
        <button
          type="button"
          className="btc-btn"
          onClick={() => setMode('check')}
          style={{ width: '100%', minHeight: 52, marginTop: 18, fontSize: fs(15), borderRadius: 26 }}
        >
          {isReview ? `Review · ${CHECK_SIZE} questions` : `Check your understanding · ${CHECK_SIZE} questions`}
        </button>
      )}
    </LearnFrame>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={null}>
      <LessonScreen />
    </Suspense>
  );
}
