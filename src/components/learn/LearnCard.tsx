'use client';

// Learn entry point on the Play screen. Renders nothing until at least one
// topic has a usable (approved, or preview-build) lesson, so a release build
// with no reviewed content looks exactly like today's Play screen.

import Link from 'next/link';
import { summarize, suggestNext } from '../../lib/learn/progress';
import { useLearnData, useLearnProgress, useNow, useUsableTopics } from '../../lib/learn/useLearn';

export default function LearnCard() {
  const { data } = useLearnData();
  const topics = useUsableTopics(data);
  const [progress] = useLearnProgress();
  const now = useNow();

  if (topics.length === 0) return null;

  // First topic with work in progress or a review ready gets the "Continue" line.
  let line: { href: string; text: string } | null = null;
  let reviews = 0;
  for (const { topic, lessons } of topics) {
    const ids = lessons.map((l) => l.id);
    const s = summarize(progress, ids, now);
    reviews += s.reviewReady;
    const next = suggestNext(progress, ids, now);
    if (!line && next && (s.understood > 0 || s.inProgress > 0)) {
      const title = lessons.find((l) => l.id === next.lessonId)?.title ?? '';
      line = {
        href: `/learn/lesson?id=${encodeURIComponent(next.lessonId)}`,
        text: `${next.reason === 'review' ? 'Review' : 'Continue'}: ${topic.title} · ${title}`,
      };
    }
  }

  return (
    <div
      style={{
        marginTop: 14, padding: 14, borderRadius: 16,
        border: '1px solid var(--btc-border)', background: 'var(--btc-surface)',
      }}
    >
      <Link href="/learn" style={{ display: 'block', color: 'var(--btc-ink)', textDecoration: 'none', minHeight: 44 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>📚 Learn</div>
        <div className="btc-text-muted" style={{ fontSize: 13, marginTop: 2 }}>
          Guided lessons on Bible topics, people and books
          {reviews > 0 ? ` · ${reviews} review${reviews === 1 ? '' : 's'} ready` : ''}
        </div>
      </Link>
      {line && (
        <Link href={line.href} style={{ display: 'block', marginTop: 8, fontWeight: 700, fontSize: 14, color: 'var(--btc-accent-deep)', minHeight: 32 }}>
          {line.text} →
        </Link>
      )}
    </div>
  );
}
