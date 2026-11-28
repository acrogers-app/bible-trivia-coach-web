'use client';

import Link from 'next/link';
import { CHECK_SIZE, TOPIC_TYPE_LABEL, type TopicType } from '../../lib/learn/content';
import { summarize, suggestNext } from '../../lib/learn/progress';
import { useLearnData, useLearnProgress, useNow, useUsableTopics } from '../../lib/learn/useLearn';
import { LearnFrame, LoadingOrError } from '../../components/learn/LearnChrome';

const TYPE_ORDER: TopicType[] = ['theme', 'person', 'book'];

export default function LearnHomePage() {
  const { data, error } = useLearnData();
  const topics = useUsableTopics(data);
  const [progress] = useLearnProgress();
  const now = useNow();

  const allIds = topics.flatMap((t) => t.lessons.map((l) => l.id));
  const overall = summarize(progress, allIds, now);

  return (
    <LearnFrame back={{ href: '/play', label: 'Play' }} preview={!!data?.preview}>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Learn</h1>
      <p className="btc-text-muted" style={{ marginTop: 0 }}>
        Short guided lessons on Bible topics. Each lesson shows the Scripture first, then a
        simple explanation, then a {CHECK_SIZE}-question check.
      </p>

      {!data ? (
        <LoadingOrError error={error} />
      ) : topics.length === 0 ? (
        <p className="btc-text-muted">Lessons are being prepared. Check back soon.</p>
      ) : (
        <>
          {(overall.understood > 0 || overall.inProgress > 0) && (
            <p style={{ fontSize: 14, fontWeight: 600 }}>
              {overall.understood} lesson{overall.understood === 1 ? '' : 's'} understood
              {overall.reviewReady > 0 ? ` · ${overall.reviewReady} review${overall.reviewReady === 1 ? '' : 's'} ready` : ''}
              {overall.inProgress > 0 ? ` · ${overall.inProgress} in progress` : ''}
            </p>
          )}

          {TYPE_ORDER.map((type) => {
            const group = topics.filter((t) => t.topic.type === type);
            if (group.length === 0) return null;
            return (
              <section key={type} style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: 16, marginBottom: 8 }}>{TOPIC_TYPE_LABEL[type]}</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {group.map(({ topic, lessons }) => {
                    const ids = lessons.map((l) => l.id);
                    const s = summarize(progress, ids, now);
                    const next = suggestNext(progress, ids, now);
                    return (
                      <Link
                        key={topic.id}
                        href={`/learn/topic?id=${encodeURIComponent(topic.id)}`}
                        style={{
                          display: 'block', padding: 14, borderRadius: 16, minHeight: 64,
                          border: '1px solid var(--btc-border)', background: 'var(--btc-surface)',
                          color: 'var(--btc-ink)', textDecoration: 'none',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 17 }}>{topic.title}</div>
                        <div className="btc-text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {s.understood} of {s.total} lesson{s.total === 1 ? '' : 's'} understood
                          {s.reviewReady > 0 ? ` · ${s.reviewReady} review ready` : ''}
                          {next?.reason === 'continue' && (s.understood > 0 || s.inProgress > 0) ? ' · continue' : ''}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </LearnFrame>
  );
}
