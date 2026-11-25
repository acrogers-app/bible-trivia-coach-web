// Learn progress: pure state logic plus a thin localStorage wrapper.
// No imports, so Node's test runner can load this file directly.
//
// Rules (approved 2026-11-22):
// - States: Not started · In progress · Understood · Review ready (+ Skipped by quick start).
// - A 4-question check with 3+ correct marks the lesson's material as understood.
// - Progress is never lost: a missed review keeps "understood" and simply schedules another review.
// - Learn writes ONLY its own key. It never touches XP, streak, Path, quiz bests,
//   missed-question review, daily challenge, or analytics.
// - The key starts with `btc_` so the existing native backup (durableBackup.ts) includes it.

export const LEARN_PROGRESS_KEY = 'btc_learn_progress_v1';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days until the 1st, 2nd and 3rd+ review becomes ready. */
export const REVIEW_INTERVAL_DAYS = [3, 10, 30] as const;

const CHECK_SIZE = 5;
const PASS_CORRECT = 4;

export type StoredLessonState = 'in_progress' | 'understood' | 'skipped';
export type LessonStatus = 'not_started' | 'in_progress' | 'understood' | 'review_ready' | 'skipped';

export interface LessonRecord {
  state: StoredLessonState;
  /** Best check so far, e.g. { correct: 4, total: 5 }. */
  bestCheck?: { correct: number; total: number };
  /** Epoch ms. */
  lastCheckedAt?: number;
  /** Epoch ms; when the next review becomes ready (understood lessons only). */
  nextReviewAt?: number;
  /** Reviews passed after the lesson was first understood. */
  reviewCount: number;
}

export interface LearnProgress {
  version: 1;
  lessons: Record<string, LessonRecord>;
}

export function emptyProgress(): LearnProgress {
  return { version: 1, lessons: {} };
}

/** True when a check result counts as understanding this lesson's material. */
export function isPassingCheck(correct: number, total: number): boolean {
  return total === CHECK_SIZE && correct >= PASS_CORRECT;
}

function reviewIntervalMs(reviewCount: number): number {
  const i = Math.min(reviewCount, REVIEW_INTERVAL_DAYS.length - 1);
  return REVIEW_INTERVAL_DAYS[i] * DAY_MS;
}

function withLesson(p: LearnProgress, id: string, rec: LessonRecord): LearnProgress {
  return { ...p, lessons: { ...p.lessons, [id]: rec } };
}

/** Opening a lesson that was never started (or was skipped) marks it in progress. */
export function markStarted(p: LearnProgress, lessonId: string): LearnProgress {
  const rec = p.lessons[lessonId];
  if (rec && rec.state !== 'skipped') return p;
  return withLesson(p, lessonId, { ...(rec ?? { reviewCount: 0 }), state: 'in_progress' });
}

/**
 * Records a finished check. First pass -> understood (review scheduled).
 * A check on an already-understood lesson is a review: pass -> next interval;
 * miss -> stays understood, next review in the first interval. Nothing is lost.
 */
export function recordCheck(
  p: LearnProgress,
  lessonId: string,
  correct: number,
  total: number,
  now: number,
): LearnProgress {
  const prev = p.lessons[lessonId];
  const passed = isPassingCheck(correct, total);
  const best =
    !prev?.bestCheck || correct > prev.bestCheck.correct ? { correct, total } : prev.bestCheck;

  if (prev?.state === 'understood') {
    const reviewCount = passed ? prev.reviewCount + 1 : prev.reviewCount;
    return withLesson(p, lessonId, {
      ...prev,
      bestCheck: best,
      lastCheckedAt: now,
      reviewCount,
      nextReviewAt: now + (passed ? reviewIntervalMs(reviewCount) : reviewIntervalMs(0)),
    });
  }

  if (passed) {
    return withLesson(p, lessonId, {
      state: 'understood',
      bestCheck: best,
      lastCheckedAt: now,
      reviewCount: 0,
      nextReviewAt: now + reviewIntervalMs(0),
    });
  }

  return withLesson(p, lessonId, {
    state: 'in_progress',
    bestCheck: best,
    lastCheckedAt: now,
    reviewCount: prev?.reviewCount ?? 0,
  });
}

/**
 * Optional quick start: a perfect score on the short check marks lesson 1 as
 * skipped (still open to preview or study). Never overrides existing progress.
 */
export function applyQuickStart(
  p: LearnProgress,
  firstLessonId: string,
  correct: number,
  total: number,
): LearnProgress {
  if (p.lessons[firstLessonId] || total <= 0 || correct < total) return p;
  return withLesson(p, firstLessonId, { state: 'skipped', reviewCount: 0 });
}

export function lessonStatus(p: LearnProgress, lessonId: string, now: number): LessonStatus {
  const rec = p.lessons[lessonId];
  if (!rec) return 'not_started';
  if (rec.state === 'understood') {
    return rec.nextReviewAt !== undefined && now >= rec.nextReviewAt ? 'review_ready' : 'understood';
  }
  return rec.state;
}

export const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  understood: 'Understood',
  review_ready: 'Review ready',
  skipped: 'Skipped · preview anytime',
};

export const STATUS_ICON: Record<LessonStatus, string> = {
  not_started: '○',
  in_progress: '◐',
  understood: '✓',
  review_ready: '↻',
  skipped: '↷',
};

export interface ProgressSummary {
  total: number;
  understood: number; // includes review-ready lessons
  reviewReady: number;
  inProgress: number;
}

export function summarize(p: LearnProgress, lessonIds: readonly string[], now: number): ProgressSummary {
  const s: ProgressSummary = { total: lessonIds.length, understood: 0, reviewReady: 0, inProgress: 0 };
  for (const id of lessonIds) {
    const st = lessonStatus(p, id, now);
    if (st === 'understood' || st === 'review_ready') s.understood++;
    if (st === 'review_ready') s.reviewReady++;
    if (st === 'in_progress') s.inProgress++;
  }
  return s;
}

/**
 * Suggested next lesson in a topic: the first lesson in order that is not yet
 * understood or skipped; otherwise the first lesson with a review ready; else null.
 */
export function suggestNext(
  p: LearnProgress,
  orderedLessonIds: readonly string[],
  now: number,
): { lessonId: string; reason: 'continue' | 'review' } | null {
  for (const id of orderedLessonIds) {
    const st = lessonStatus(p, id, now);
    if (st === 'not_started' || st === 'in_progress') return { lessonId: id, reason: 'continue' };
  }
  for (const id of orderedLessonIds) {
    if (lessonStatus(p, id, now) === 'review_ready') return { lessonId: id, reason: 'review' };
  }
  return null;
}

/** Defensive parse: anything malformed becomes empty progress (never throws). */
export function parseProgress(raw: string | null): LearnProgress {
  if (!raw) return emptyProgress();
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return emptyProgress();
    const lessons = (v as { lessons?: unknown }).lessons;
    if (!lessons || typeof lessons !== 'object') return emptyProgress();
    const out: Record<string, LessonRecord> = {};
    for (const [id, r] of Object.entries(lessons as Record<string, unknown>)) {
      if (!r || typeof r !== 'object') continue;
      const rec = r as Partial<LessonRecord>;
      if (rec.state !== 'in_progress' && rec.state !== 'understood' && rec.state !== 'skipped') continue;
      out[id] = {
        state: rec.state,
        reviewCount: typeof rec.reviewCount === 'number' ? rec.reviewCount : 0,
        ...(rec.bestCheck && typeof rec.bestCheck.correct === 'number' && typeof rec.bestCheck.total === 'number'
          ? { bestCheck: { correct: rec.bestCheck.correct, total: rec.bestCheck.total } }
          : {}),
        ...(typeof rec.lastCheckedAt === 'number' ? { lastCheckedAt: rec.lastCheckedAt } : {}),
        ...(typeof rec.nextReviewAt === 'number' ? { nextReviewAt: rec.nextReviewAt } : {}),
      };
    }
    return { version: 1, lessons: out };
  } catch {
    return emptyProgress();
  }
}

// ---- Storage (browser only) ----

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function storage(): StorageLike | null {
  try {
    const w = (globalThis as { window?: { localStorage?: StorageLike } }).window;
    return w?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadLearnProgress(): LearnProgress {
  const s = storage();
  return s ? parseProgress(s.getItem(LEARN_PROGRESS_KEY)) : emptyProgress();
}

export function saveLearnProgress(p: LearnProgress): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(LEARN_PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked: progress is a convenience, never block learning
  }
}
