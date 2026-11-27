'use client';

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import type { SplitLayout } from '../../lib/duoLayout';

/**
 * Two related panes on a large or foldable display (iPhone Duo inner display, iPad), one column
 * everywhere else. Layout comes from useDuoSplit(): side by side with the gutter on a vertical
 * fold, or top/bottom across an active horizontal fold (laptop pose). Nothing is placed in the
 * fold, the safe-area insets (status/camera column) or under the bottom nav.
 *
 * The element tree is the same in every mode (a wrapper with keyed pane children), so state
 * inside a pane (e.g. a lesson check in progress) survives folding, unfolding and rotation.
 * In single mode the wrapper and panes carry no styles or landmarks: the phone layout is unchanged.
 * Panes scroll independently only when split.
 */
export default function DuoSplit({
  layout,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
}: {
  layout: SplitLayout;
  primary: ReactNode | null;
  secondary: ReactNode;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const split = layout.mode !== 'single';

  // While split, the panes scroll; the page behind them must not.
  useEffect(() => {
    if (!split) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, [split]);

  const edge = 8;
  // --duo-banner: height of the fixed Family Mode banner while it shows (globals.css), else 0.
  const top = `calc(env(safe-area-inset-top) + var(--duo-banner, 0px) + ${edge}px)`;
  const left = `calc(env(safe-area-inset-left) + ${edge}px)`;
  const right = `calc(env(safe-area-inset-right) + ${edge}px)`;
  const bottom = `${layout.bottom + edge}px`;
  // The theme toggle floats at the top-right corner: the pane under it starts below it, so
  // scrolled content never slides under the toggle.
  const belowToggle = `calc(env(safe-area-inset-top) + var(--duo-banner, 0px) + 64px)`;
  let primaryStyle: CSSProperties | undefined;
  let secondaryStyle: CSSProperties | undefined;
  if (layout.mode === 'columns') {
    primaryStyle = { top, bottom, left, width: `calc(${layout.leadEnd}px - env(safe-area-inset-left) - ${edge * 1.5}px)` };
    secondaryStyle = { top: belowToggle, bottom, right, left: `${layout.trailStart + edge / 2}px` };
  } else if (layout.mode === 'rows') {
    primaryStyle = { top: belowToggle, left, right, height: `calc(${layout.topEnd}px - env(safe-area-inset-top) - var(--duo-banner, 0px) - 64px - ${edge / 2}px)` };
    secondaryStyle = { left, right, bottom, top: `${layout.bottomStart + edge / 2}px` };
  }

  const paneBase: CSSProperties = {
    position: 'absolute',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    boxSizing: 'border-box',
    padding: '16px 18px 24px',
    borderRadius: 20,
    background: 'var(--app-card-bg, #ffffff)',
    border: '1px solid var(--app-card-border, transparent)',
  };

  return (
    <div
      data-duo-split={layout.mode}
      style={split ? { position: 'fixed', inset: 0, zIndex: 20, background: 'var(--app-root-bg, #020617)' } : undefined}
    >
      {primary != null && (
        <div
          key="primary"
          role={split ? 'region' : undefined}
          aria-label={split ? primaryLabel : undefined}
          className={split ? 'duo-pane' : undefined}
          style={split ? { ...paneBase, ...primaryStyle } : undefined}
        >
          {primary}
        </div>
      )}
      <div
        key="secondary"
        role={split ? 'region' : undefined}
        aria-label={split ? secondaryLabel : undefined}
        className={split ? 'duo-pane' : undefined}
        style={split ? { ...paneBase, ...secondaryStyle } : undefined}
      >
        {secondary}
      </div>
    </div>
  );
}
