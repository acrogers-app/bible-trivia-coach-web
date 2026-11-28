// Learn content model and pure helpers (no imports, so Node's test runner can
// load this file directly). Content lives in /public/data/topics_en_v1.json.
//
// Review gate: only lessons with review.status === 'approved' are shown in a
// normal build. Draft lessons stay out of /public (see content/learn/README.md)
// and are only visible in a preview build (NEXT_PUBLIC_LEARN_PREVIEW=1).

export type TopicType = 'theme' | 'person' | 'book';
export type ReviewStatus = 'draft' | 'approved';

/** A Scripture range within one book, e.g. { start: 'Ephesians 2:1', end: 'Ephesians 2:10' }. */
export interface LessonPassage {
  start: string;
  end: string;
}

export interface LearnLesson {
  id: string;
  title: string;
  /** Scripture is fetched by reference (World English Bible); lesson files never copy verse text. */
  passages: LessonPassage[];
  /** Short explanation. Shown labelled as explanation, never as Scripture. */
  explanation: string;
  /** Optional deeper notes. viewsDiffer marks interpretations Christians hold differently. */
  deeper?: { text: string; viewsDiffer?: boolean };
  /** Optional reflection prompt. Not tracked. */
  reflectPrompt?: string;
  /** Existing trivia question ids. The check uses the first CHECK_SIZE of them. */
  questionIds: string[];
  review: { status: ReviewStatus; /** The approver (internal record; never displayed). */ reviewer?: string; reviewedAt?: string };
}

export interface LearnTopic {
  id: string;
  title: string;
  type: TopicType;
  summary?: string;
  relatedTopicIds?: string[];
  lessons: LearnLesson[];
}

export interface LearnContent {
  version: 1;
  topics: LearnTopic[];
}

/** A Learn check is exactly this many questions. */
export const CHECK_SIZE = 5;
/** Correct answers needed (of CHECK_SIZE) to mark a lesson's material as understood: 4 of 5 = 80%. Never lowered: fewer than 5 approved questions is a content gap. */
export const PASS_CORRECT = 4;
/** Optional quick-start check size (taken from lesson 1's questions). */
export const QUICK_START_SIZE = 2;

export const TOPIC_TYPE_LABEL: Record<TopicType, string> = {
  theme: 'Themes',
  person: 'People',
  book: 'Books',
};

/** Minimal shape of a trivia question this module needs. */
export interface CheckQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  refStart: string;
  refEnd: string;
}

/**
 * Picks the check questions for a lesson from the question bank, in lesson order.
 * Returns null when fewer than `size` listed questions exist in the bank: that is a
 * content gap to flag, never a reason to shrink the check.
 */
export function selectCheckQuestions<Q extends { id: string }>(
  lesson: Pick<LearnLesson, 'questionIds'>,
  bankById: ReadonlyMap<string, Q>,
  size: number = CHECK_SIZE,
): Q[] | null {
  const found: Q[] = [];
  for (const id of lesson.questionIds) {
    const q = bankById.get(id);
    if (q) found.push(q);
    if (found.length === size) return found;
  }
  return null;
}

/** True when a lesson may be shown: approved, or any status in a preview build. */
export function isLessonVisible(lesson: LearnLesson, preview: boolean): boolean {
  return preview || lesson.review.status === 'approved';
}

/**
 * Lessons a learner can use: visible under the review gate AND backed by a full
 * CHECK_SIZE-question check. Lessons failing the second condition are content gaps.
 */
export function usableLessons<Q extends { id: string }>(
  topic: LearnTopic,
  bankById: ReadonlyMap<string, Q>,
  preview: boolean,
): LearnLesson[] {
  return topic.lessons.filter(
    (l) => isLessonVisible(l, preview) && selectCheckQuestions(l, bankById) !== null,
  );
}

/** "Ephesians 2:1" + "Ephesians 2:10" -> "Ephesians 2:1–10"; across chapters keeps both. */
export function formatPassage(p: LessonPassage): string {
  const a = p.start.match(/^(.+?)\s+(\d+):(\d+)$/);
  const b = p.end.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!a || !b || a[1] !== b[1]) return `${p.start} – ${p.end}`;
  if (a[2] === b[2]) return a[3] === b[3] ? p.start : `${p.start}–${b[3]}`;
  return `${p.start}–${b[2]}:${b[3]}`;
}
