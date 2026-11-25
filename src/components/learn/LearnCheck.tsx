'use client';

// Learn's own lightweight check. Deliberately separate from the Play quiz flow:
// it does not touch XP, the day streak, Path, quiz bests, the missed-question
// list, the daily challenge, or analytics. The parent records the result in
// Learn progress only.

import { useEffect, useRef, useState } from 'react';
import { formatPassage, type CheckQuestion } from '../../lib/learn/content';
import { BODY_FS, fs } from '../../lib/learn/textScale';

export default function LearnCheck({
  questions,
  label,
  onDone,
  onCancel,
}: {
  questions: CheckQuestion[];
  label: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const questionRef = useRef<HTMLHeadingElement>(null);

  // Each new question starts at the top of the screen, and screen readers move to it so it is
  // announced (the Check button or the Next button that started it is gone or disabled).
  useEffect(() => {
    window.scrollTo(0, 0);
    questionRef.current?.focus({ preventScroll: true });
  }, [index]);

  const q = questions[index];
  const answered = chosen !== null;
  const isLast = index === questions.length - 1;

  function choose(i: number) {
    if (answered) return;
    setChosen(i);
    if (i === q.correctIndex) setCorrect((c) => c + 1);
  }

  function next() {
    if (!answered) return;
    if (isLast) {
      onDone(correct, questions.length);
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  }

  return (
    <section aria-label={label}>
      <div id="learn-check-progress" className="btc-text-muted" style={{ fontSize: fs(13), marginBottom: 6 }}>
        {label} · Question {index + 1} of {questions.length}
      </div>
      <h2
        ref={questionRef}
        tabIndex={-1}
        aria-describedby="learn-check-progress"
        className="learn-h2"
        style={{ marginTop: 0, lineHeight: 1.35, outline: 'none' }}
      >
        {q.text}
      </h2>

      <div role="group" aria-label="Answer choices" style={{ display: 'grid', gap: 10 }}>
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isChosen = i === chosen;
          let border = '1.5px solid var(--btc-border)';
          let background = 'var(--btc-surface)';
          let mark = '';
          if (answered && isCorrect) { border = '2px solid var(--btc-success, #16a34a)'; background = 'rgba(34,197,94,0.10)'; mark = isChosen ? 'Correct answer, your answer' : 'Correct answer'; }
          else if (answered && isChosen) { border = '2px solid var(--btc-red, #dc2626)'; background = 'rgba(239,68,68,0.08)'; mark = 'Your answer'; }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 14, minHeight: 48,
                border, background, color: 'var(--btc-ink)', fontSize: fs(16),
                cursor: answered ? 'default' : 'pointer', opacity: 1,
              }}
            >
              {opt}
              {mark && (
                <span style={{ fontWeight: 700, fontSize: fs(13) }}>
                  {' '}<span aria-hidden="true">{isCorrect ? '✓' : '·'}</span> {mark}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {answered && (
          <div
            style={{
              marginTop: 14, padding: 12, borderRadius: 12,
              background: 'var(--btc-elevated)', border: '1px solid var(--btc-border)',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4, fontSize: BODY_FS }}>
              {chosen === q.correctIndex ? 'That’s right.' : 'Not quite.'}
            </div>
            <div style={{ fontSize: fs(15), lineHeight: 1.5 }}>{q.explanation}</div>
            <div className="btc-text-muted" style={{ fontSize: fs(13), marginTop: 6 }}>
              See {formatPassage({ start: q.refStart, end: q.refEnd })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" className="btc-btn" onClick={next} disabled={!answered} style={{ minHeight: 48, flex: '1 1 160px', fontSize: fs(15), borderRadius: 24 }}>
          {isLast ? 'See result' : 'Next question'}
        </button>
        <button type="button" className="btc-btn btc-btn-secondary" onClick={onCancel} style={{ minHeight: 48, fontSize: fs(15), borderRadius: 24 }}>
          Back to lesson
        </button>
      </div>
    </section>
  );
}
