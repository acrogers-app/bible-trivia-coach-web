'use client';

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import BottomNav from '../BottomNav';
import { STATUS_ICON, STATUS_LABEL, type LessonStatus } from '../../lib/learn/progress';
import { fs, useSystemTextScale } from '../../lib/learn/textScale';
import { useDuoSplit } from '../../lib/duoLayout';
import DuoSplit from '../duo/DuoSplit';

/** True when Learn shows two panes (iPhone Duo inner display, iPad): Scripture beside the lesson. */
export function useLearnSplit() {
  return useDuoSplit().mode !== 'single';
}

/**
 * Page frame shared by the Learn screens: same root/card/bottom-nav pattern as Play.
 * `aside` (the lesson's Scripture) gets its own pane when the display is split; screens pass it
 * only then (see useLearnSplit), so the phone layout is unchanged. The lesson content always sits
 * in the same pane element, so a check in progress survives folding and unfolding.
 */
export function LearnFrame({
  back,
  preview,
  children,
  aside,
}: {
  back: { href: string; label: string };
  preview: boolean;
  children: ReactNode;
  aside?: { label: string; content: ReactNode } | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useSystemTextScale(rootRef);
  const layout = useDuoSplit();
  return (
    <div ref={rootRef} className="btc-root" style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
      <BottomNav />
      <main className="btc-card">
        <DuoSplit
          layout={layout}
          primary={layout.mode !== 'single' && aside ? aside.content : null}
          primaryLabel={aside?.label ?? 'Scripture'}
          secondaryLabel="Lesson"
          secondary={<>
        <Link href={back.href} style={{ fontSize: fs(14), opacity: 0.75, textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
          <span aria-hidden="true">‹&nbsp;</span>{back.label}
        </Link>
        {preview && (
          <div
            role="note"
            style={{
              margin: '4px 0 12px', padding: '8px 12px', borderRadius: 12, fontSize: fs(13), fontWeight: 600,
              background: 'var(--btc-warn-soft)', border: '1px solid rgba(251,146,60,0.5)',
            }}
          >
            Preview build: draft lessons, not approved. Not for release.
          </div>
        )}
        {children}
          </>}
        />
      </main>
    </div>
  );
}

/** Lesson state shown as icon + words (never color alone). */
export function StatusChip({ status }: { status: LessonStatus }) {
  const tone =
    status === 'understood' ? 'rgba(34,197,94,0.12)'
      : status === 'review_ready' ? 'rgba(59,130,246,0.12)'
        : status === 'in_progress' ? 'rgba(234,179,8,0.14)'
          : 'rgba(0,0,0,0.05)';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
        borderRadius: 22, fontSize: fs(12), fontWeight: 700, background: tone,
      }}
    >
      <span aria-hidden="true">{STATUS_ICON[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LoadingOrError({ error }: { error: string | null }) {
  return (
    <p className="btc-text-muted" role={error ? 'alert' : undefined}>
      {error ? `Lessons could not be loaded. ${error}` : 'Loading lessons…'}
    </p>
  );
}
