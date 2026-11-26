'use client';

// iPhone Duo (foldable) layout state for the web layer.
//
// The fold is invisible to CSS in WKWebView, so the iOS host reports UIKit's reserved regions
// through the "DuoLayout" Capacitor plugin (ios/App/App/DuoLayoutBridge.swift). This module turns
// that report plus the live viewport, safe areas, bottom-nav height and text size into one
// SplitLayout that screens use to choose between the phone column and two panes.
//
// Rules (see DUO.md):
// - No device detection and no hardcoded hinge coordinates. A fold is used only when the host
//   reports one; otherwise two panes come from plain width/height rules (iPad, desktop).
// - A vertical fold (book) becomes the gutter between side-by-side panes, active or not.
// - A horizontal fold (laptop/tabletop) splits top/bottom only while it is active (half open).
// - Panes must stay usable at the current text size; otherwise everything stays one column.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { useSyncExternalStore } from 'react';

export type DuoRegion = { x: number; y: number; width: number; height: number; active: boolean };
export type DuoHinge = 'closed' | 'partiallyOpen' | 'fullyOpen' | 'unknown' | 'unavailable';
/** What the iOS host reports (DuoLayoutPlugin.snapshot()). Web-view points = CSS px. */
export type DuoLayoutSnapshot = {
  available: boolean;
  viewport?: { width: number; height: number };
  hinge?: DuoHinge;
  hingeAngle?: number;
  division?: DuoRegion[];
  occlusion?: DuoRegion[];
};

interface DuoLayoutPlugin {
  getLayout(): Promise<DuoLayoutSnapshot>;
  addListener(event: 'layoutChange', fn: (s: DuoLayoutSnapshot) => void): Promise<PluginListenerHandle>;
}

export type Fold = { axis: 'vertical' | 'horizontal'; start: number; end: number; active: boolean };

/** Pixel edges are in viewport (CSS px) coordinates; `bottom` is the space the bottom nav needs. */
export type SplitLayout =
  | { mode: 'single'; fold: Fold | null; bottom: number }
  | { mode: 'columns'; leadEnd: number; trailStart: number; fold: Fold | null; bottom: number }
  | { mode: 'rows'; topEnd: number; bottomStart: number; fold: Fold; bottom: number };

const SINGLE: SplitLayout = { mode: 'single', fold: null, bottom: 0 };
/** Narrowest useful pane at default text size; scaled by app + system text size. */
const MIN_PANE = 300;
const MIN_ROW = 200;
const GUTTER = 24;

let snapshot: DuoLayoutSnapshot | null = null;
let current: SplitLayout = SINGLE;
let currentKey = '';
let started = false;
const subscribers = new Set<() => void>();

function px(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function safeAreas() {
  let probe = document.getElementById('duo-safe-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'duo-safe-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
}

function textScale(): number {
  const cs = getComputedStyle(document.documentElement);
  const mult = px(cs.getPropertyValue('--btc-font-mult')) || 1;
  const dt = px(cs.getPropertyValue('--learn-dt')) || 1;
  return mult * dt;
}

/** The fold as reported by the host, mapped to CSS px. Null when the host reports none. */
export function foldFrom(s: DuoLayoutSnapshot | null, vw: number, vh: number): Fold | null {
  if (!s?.available || !s.division?.length) return null;
  const scale = s.viewport?.width ? vw / s.viewport.width : 1;
  for (const r of s.division) {
    const x = r.x * scale, y = r.y * scale, w = r.width * scale, h = r.height * scale;
    // Must lie inside the viewport (while folding, one report can still carry the other display's fold).
    if (w <= 0 || h <= 0 || x < -1 || y < -1 || x + w > vw + 1 || y + h > vh + 1) continue;
    if (h >= vh * 0.5 && w < vw * 0.25) return { axis: 'vertical', start: x, end: x + w, active: r.active };
    if (w >= vw * 0.5 && h < vh * 0.25) return { axis: 'horizontal', start: y, end: y + h, active: r.active };
  }
  return null;
}

function compute(): SplitLayout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const safe = safeAreas();
  const nav = document.querySelector('nav[aria-label="Primary navigation"]');
  const bottom = nav ? Math.max(0, vh - nav.getBoundingClientRect().top) : safe.bottom;
  const minPane = MIN_PANE * textScale();
  const fold = foldFrom(snapshot, vw, vh);

  if (fold?.axis === 'vertical') {
    const lead = fold.start - safe.left;
    const trail = vw - safe.right - fold.end;
    if (lead >= minPane && trail >= minPane && vh >= 480) {
      return { mode: 'columns', leadEnd: fold.start, trailStart: fold.end, fold, bottom };
    }
    return { mode: 'single', fold, bottom };
  }
  if (fold?.axis === 'horizontal') {
    const top = fold.start - safe.top;
    const low = vh - bottom - fold.end;
    const minRow = MIN_ROW * textScale();
    if (fold.active && top >= minRow && low >= minRow && vw >= minPane) {
      return { mode: 'rows', topEnd: fold.start, bottomStart: fold.end, fold, bottom };
    }
    return { mode: 'single', fold, bottom };
  }
  // No fold reported (iPad, desktop, older iOS): two panes only when there is clearly room.
  const usable = vw - safe.left - safe.right;
  if (usable >= 2 * minPane + GUTTER && vw >= 840 && vh >= 560) {
    const leadEnd = Math.round(safe.left + usable * 0.55 - GUTTER / 2);
    return { mode: 'columns', leadEnd, trailStart: leadEnd + GUTTER, fold: null, bottom };
  }
  return { mode: 'single', fold: null, bottom };
}

function update() {
  if (typeof window === 'undefined') return;
  const next = compute();
  const key = JSON.stringify(next);
  if (key === currentKey) return;
  currentKey = key;
  current = next;
  const root = document.documentElement;
  root.dataset.duoSplit = next.mode;
  root.dataset.duoFold = next.fold ? `${next.fold.axis}${next.fold.active ? '-active' : ''}` : 'none';
  if (snapshot?.hinge) root.dataset.duoHinge = snapshot.hinge;
  subscribers.forEach((fn) => fn());
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  // App/system text size lives in attributes and styles on <html>.
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-btc-font'] });
  // The bottom nav mounts after the first paint.
  window.setTimeout(schedule, 300);
  schedule();
  if (Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('DuoLayout')) {
    const plugin = registerPlugin<DuoLayoutPlugin>('DuoLayout');
    const take = (s: DuoLayoutSnapshot) => { snapshot = s; schedule(); };
    plugin.getLayout().then(take).catch(() => {});
    plugin.addListener('layoutChange', take).catch(() => {});
  }
}

function subscribe(fn: () => void) {
  start();
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

/** Current pane layout for this window. Server render and first paint: single column. */
export function useDuoSplit(): SplitLayout {
  return useSyncExternalStore(subscribe, () => current, () => SINGLE);
}
