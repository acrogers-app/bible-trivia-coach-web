'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QUICK_START_SIZE, TOPIC_TYPE_LABEL, selectCheckQuestions } from '../../../lib/learn/content';
import { applyQuickStart, lessonStatus, summarize, suggestNext } from '../../../lib/learn/progress';
import { useLearnData, useLearnProgress, useNow, useUsableTopics } from '../../../lib/learn/useLearn';
import { LearnFrame, LoadingOrError, StatusChip } from '../../../components/learn/LearnChrome';
import LearnCheck from '../../../components/learn/LearnCheck';

function TopicScreen() {
  const id = useSearchParams().get('id') ?? '';
  const { data, error } = useLearnData();
  const topics = useUsableTopics(data);
  const [progress, setProgress] = useLearnProgress();
  const now = useNow();
  const [mode, setMode] = useState<'map' | 'quick'>('map');
  const [quickResult, setQuickResult] = useState<'skipped' | 'start' | null>(null);

  const entry = topics.find((t) => t.topic.id === id);

  if (!data || !entry) {
    return (
      <LearnFrame back={{ href: '/learn', label: 'Learn' }} preview={!!data?.preview}>
        {!data ? <LoadingOrError error={error} /> : <p>This topic isn’t available yet.</p>}
      </LearnFrame>
    );
  }

  const { topic, lessons } = entry;
  const ids = lessons.map((l) => l.id);
  const s = summarize(progress, ids, now);
  const next = suggestNext(progress, ids, now);
  const first = lessons[0];
  const quickQuestions = selectCheckQuestions(first, data.bank, QUICK_START_SIZE);
  const offerQuickStart =
    lessons.length >= 2 && quickQuestions !== null && lessonStatus(progress, first.id, now) === 'not_started';
  const related = (topic.relatedTopicIds ?? [])
    .map((rid) => topics.find((t) => t.topic.id === rid))
    .filter((t): t is NonNullable<typeof t> => !!t);

  if (mode === 'quick' && quickQuestions) {
    return (
      <LearnFrame back={{ href: '/learn', label: 'Learn' }} preview={data.preview}>
        <LearnCheck
          questions={quickQuestions}
          label={`${topic.title}: optional quick start`}
          onCancel={() => setMode('map')}
          onDone={(correct, total) => {
            const nextProgress = applyQuickStart(progress, first.id, correct, total);
            setProgress(nextProgress);
            setQuickResult(nextProgress === progress ? 'start' : 'skipped');
            setMode('map');
          }}
        />
      </LearnFrame>
    );
  }

  return (
    <LearnFrame back={{ href: '/learn', label: 'Learn' }} preview={data.preview}>
      <div className="btc-text-muted" style={{ fontSize: 13 }}>{TOPIC_TYPE_LABEL[topic.type]}</div>
      <h1 style={{ marginTop: 2, marginBottom: 4 }}>{topic.title}</h1>
      {topic.summary && <p style={{ marginTop: 0 }}>{topic.summary}</p>}
      <p className="btc-text-muted" style={{ fontSize: 14, marginTop: 4 }}>
        {s.understood} of {s.total} understood{s.reviewReady > 0 ? ` · ${s.reviewReady} review ready` : ''}
      </p>

      {quickResult && (
        <p role="status" style={{ fontSize: 14, padding: '8px 12px', borderRadius: 12, background: 'var(--btc-elevated)' }}>
          {quickResult === 'skipped'
            ? `You already know lesson 1’s material, so it’s marked Skipped. You can open it anytime.`
            : `Good to know where you are. Lesson 1 is a good place to start.`}
        </p>
      )}

      {next && (
        <Link
          className="btc-btn"
          href={`/learn/lesson?id=${encodeURIComponent(next.lessonId)}`}
          style={{ display: 'block', textAlign: 'center', minHeight: 48, lineHeight: '24px', marginTop: 8, textDecoration: 'none' }}
        >
          {next.reason === 'review' ? 'Review' : s.understood + s.inProgress > 0 ? 'Continue' : 'Start'}:{' '}
          {lessons.find((l) => l.id === next.lessonId)?.title}
        </Link>
      )}

      {offerQuickStart && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <span className="btc-text-muted">Already familiar? </span>
          <button
            type="button"
            onClick={() => { setQuickResult(null); setMode('quick'); }}
            style={{ background: 'none', border: 'none', padding: '10px 0', color: 'var(--btc-accent-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Take an optional {QUICK_START_SIZE}-question check
          </button>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8 }}>Lessons</h2>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        {lessons.map((l, i) => {
          const st = lessonStatus(progress, l.id, now);
          return (
            <li key={l.id}>
              <Link
                href={`/learn/lesson?id=${encodeURIComponent(l.id)}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '12px 14px', borderRadius: 14, minHeight: 56,
                  border: '1px solid var(--btc-border)', background: 'var(--btc-surface)',
                  color: 'var(--btc-ink)', textDecoration: 'none',
                }}
              >
                <span>
                  <span className="btc-text-muted" style={{ fontSize: 12, display: 'block' }}>Lesson {i + 1}</span>
                  <span style={{ fontWeight: 700 }}>{l.title}</span>
                </span>
                <StatusChip status={st} />
              </Link>
            </li>
          );
        })}
      </ol>

      {related.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8 }}>Related topics</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {related.map((r) => (
              <Link
                key={r.topic.id}
                href={`/learn/topic?id=${encodeURIComponent(r.topic.id)}`}
                style={{ padding: '10px 14px', borderRadius: 22, border: '1px solid var(--btc-border)', color: 'var(--btc-ink)', textDecoration: 'none', fontWeight: 600 }}
              >
                {r.topic.title}
              </Link>
            ))}
          </div>
        </>
      )}
    </LearnFrame>
  );
}

export default function TopicPage() {
  return (
    <Suspense fallback={null}>
      <TopicScreen />
    </Suspense>
  );
}
