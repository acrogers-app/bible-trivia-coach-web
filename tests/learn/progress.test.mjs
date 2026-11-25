// Behaviour tests for Learn progress and content rules.
// Run: npm run test:learn  (Node's built-in runner; Node 22.18+ strips TS types natively.)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../src/lib/learn/progress.ts';
import * as C from '../../src/lib/learn/content.ts';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 22, 12);

test('check rule matches the approved 5-question / 4-correct standard in both modules', () => {
  assert.equal(C.CHECK_SIZE, 5);
  assert.equal(C.PASS_CORRECT, 4);
  assert.equal(P.isPassingCheck(4, 5), true);
  assert.equal(P.isPassingCheck(5, 5), true);
  assert.equal(P.isPassingCheck(3, 5), false);
  assert.equal(P.isPassingCheck(3, 4), false, 'a shortened check never passes');
  assert.equal(P.isPassingCheck(4, 4), false, 'a shortened check never passes');
  // A shorter check never passes: the rule is not silently changed for short lessons.
  assert.equal(P.isPassingCheck(3, 3), false);
  assert.equal(P.isPassingCheck(2, 2), false);
});

test('a never-opened lesson is Not started; opening it makes it In progress', () => {
  let p = P.emptyProgress();
  assert.equal(P.lessonStatus(p, 'a', T0), 'not_started');
  p = P.markStarted(p, 'a');
  assert.equal(P.lessonStatus(p, 'a', T0), 'in_progress');
});

test('4 of 5 marks the lesson Understood; 3 of 5 stays In progress', () => {
  let p = P.recordCheck(P.emptyProgress(), 'a', 3, 5, T0);
  assert.equal(P.lessonStatus(p, 'a', T0), 'in_progress');
  p = P.recordCheck(p, 'a', 4, 5, T0);
  assert.equal(P.lessonStatus(p, 'a', T0), 'understood');
  assert.deepEqual(p.lessons.a.bestCheck, { correct: 4, total: 5 });
});

test('reviews become ready at 3, then 10, then 30 days', () => {
  let p = P.recordCheck(P.emptyProgress(), 'a', 5, 5, T0);
  assert.equal(P.lessonStatus(p, 'a', T0 + 3 * DAY - 1), 'understood');
  assert.equal(P.lessonStatus(p, 'a', T0 + 3 * DAY), 'review_ready');

  const t1 = T0 + 3 * DAY;
  p = P.recordCheck(p, 'a', 4, 5, t1);
  assert.equal(p.lessons.a.reviewCount, 1);
  assert.equal(P.lessonStatus(p, 'a', t1 + 10 * DAY - 1), 'understood');
  assert.equal(P.lessonStatus(p, 'a', t1 + 10 * DAY), 'review_ready');

  const t2 = t1 + 10 * DAY;
  p = P.recordCheck(p, 'a', 5, 5, t2);
  assert.equal(P.lessonStatus(p, 'a', t2 + 30 * DAY), 'review_ready');
  const t3 = t2 + 30 * DAY;
  p = P.recordCheck(p, 'a', 5, 5, t3);
  assert.equal(P.lessonStatus(p, 'a', t3 + 30 * DAY), 'review_ready', 'stays at the 30-day interval');
});

test('progress is never lost: a missed review keeps Understood and long gaps change nothing', () => {
  let p = P.recordCheck(P.emptyProgress(), 'a', 5, 5, T0);
  const later = T0 + 400 * DAY;
  assert.equal(P.lessonStatus(p, 'a', later), 'review_ready');
  p = P.recordCheck(p, 'a', 1, 5, later);
  assert.equal(p.lessons.a.state, 'understood');
  assert.equal(P.lessonStatus(p, 'a', later), 'understood');
  assert.equal(P.lessonStatus(p, 'a', later + 3 * DAY), 'review_ready');
  assert.deepEqual(p.lessons.a.bestCheck, { correct: 5, total: 5 }, 'best check is kept');
});

test('quick start is optional, needs a perfect score, and never overrides progress', () => {
  let p = P.applyQuickStart(P.emptyProgress(), 'l1', 1, 2);
  assert.equal(P.lessonStatus(p, 'l1', T0), 'not_started');
  p = P.applyQuickStart(p, 'l1', 2, 2);
  assert.equal(P.lessonStatus(p, 'l1', T0), 'skipped');
  // Skipped material stays open: opening it makes it In progress.
  assert.equal(P.lessonStatus(P.markStarted(p, 'l1'), 'l1', T0), 'in_progress');
  // Existing progress is not replaced.
  const understood = P.recordCheck(P.emptyProgress(), 'l1', 5, 5, T0);
  assert.equal(P.applyQuickStart(understood, 'l1', 2, 2).lessons.l1.state, 'understood');
});

test('suggestNext continues in order, then offers reviews, else nothing', () => {
  const ids = ['l1', 'l2', 'l3'];
  let p = P.emptyProgress();
  assert.deepEqual(P.suggestNext(p, ids, T0), { lessonId: 'l1', reason: 'continue' });
  p = P.applyQuickStart(p, 'l1', 2, 2);
  assert.deepEqual(P.suggestNext(p, ids, T0), { lessonId: 'l2', reason: 'continue' });
  for (const id of ids) p = P.recordCheck(p, id, 5, 5, T0);
  assert.equal(P.suggestNext(p, ids, T0 + DAY), null);
  assert.deepEqual(P.suggestNext(p, ids, T0 + 3 * DAY), { lessonId: 'l1', reason: 'review' });
});

test('summary counts understood (incl. review-ready), review-ready and in-progress', () => {
  let p = P.recordCheck(P.emptyProgress(), 'l1', 5, 5, T0);
  p = P.markStarted(p, 'l2');
  const s = P.summarize(p, ['l1', 'l2', 'l3'], T0 + 3 * DAY);
  assert.deepEqual(s, { total: 3, understood: 1, reviewReady: 1, inProgress: 1 });
});

test('parseProgress survives junk and drops malformed records', () => {
  assert.deepEqual(P.parseProgress(null), P.emptyProgress());
  assert.deepEqual(P.parseProgress('not json'), P.emptyProgress());
  assert.deepEqual(P.parseProgress('{"lessons":[1]}').lessons, {});
  const p = P.parseProgress(JSON.stringify({ lessons: { a: { state: 'understood', reviewCount: 2, nextReviewAt: 5 }, b: { state: 'bogus' } } }));
  assert.deepEqual(Object.keys(p.lessons), ['a']);
  assert.equal(p.lessons.a.reviewCount, 2);
});

test('storage writes only the Learn key, which the btc_ backup prefix covers', () => {
  const store = new Map();
  const fake = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  globalThis.window = { localStorage: fake };
  try {
    let p = P.loadLearnProgress();
    p = P.recordCheck(P.markStarted(p, 'a'), 'a', 4, 5, T0);
    P.saveLearnProgress(p);
    assert.deepEqual([...store.keys()], [P.LEARN_PROGRESS_KEY]);
    assert.ok(P.LEARN_PROGRESS_KEY.startsWith('btc_'), 'durableBackup.ts only mirrors btc_* keys');
    for (const k of ['btc_lifetime_correct', 'btc_streak', 'btc_streak_last_date', 'btc-difficulty-progress', 'btc_missed_question_ids']) {
      assert.equal(store.has(k), false, `Learn must not write ${k}`);
    }
    assert.equal(P.lessonStatus(P.loadLearnProgress(), 'a', T0), 'understood');
  } finally {
    delete globalThis.window;
  }
});

test('check questions: exactly 5 in lesson order, or null (content gap) when fewer exist', () => {
  const bank = new Map(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id) => [id, { id }]));
  assert.deepEqual(C.selectCheckQuestions({ questionIds: ['q6', 'x', 'q1', 'q2', 'q3', 'q4', 'q5'] }, bank).map((q) => q.id), ['q6', 'q1', 'q2', 'q3', 'q4']);
  assert.equal(C.selectCheckQuestions({ questionIds: ['q1', 'q2', 'q3', 'q4', 'missing'] }, bank), null, '4 of 5 is a gap, not a shorter check');
  assert.equal(C.selectCheckQuestions({ questionIds: ['q1', 'q2'] }, bank, C.QUICK_START_SIZE).length, 2, 'quick start stays 2 questions');
});

test('review gate: drafts are hidden unless preview; lessons without a full check are not usable', () => {
  const bank = new Map(['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => [id, { id }]));
  const lesson = (id, status, qs) => ({ id, title: id, passages: [], explanation: '', questionIds: qs, review: { status } });
  const topic = {
    id: 't', title: 'T', type: 'theme',
    lessons: [lesson('ok', 'approved', ['q1', 'q2', 'q3', 'q4', 'q5']), lesson('draft', 'draft', ['q1', 'q2', 'q3', 'q4', 'q5']), lesson('gap', 'approved', ['q1', 'q2', 'q3', 'q4'])],
  };
  assert.deepEqual(C.usableLessons(topic, bank, false).map((l) => l.id), ['ok']);
  assert.deepEqual(C.usableLessons(topic, bank, true).map((l) => l.id), ['ok', 'draft']);
});

test('formatPassage', () => {
  assert.equal(C.formatPassage({ start: 'Ephesians 2:1', end: 'Ephesians 2:10' }), 'Ephesians 2:1–10');
  assert.equal(C.formatPassage({ start: 'John 3:16', end: 'John 3:16' }), 'John 3:16');
  assert.equal(C.formatPassage({ start: 'Luke 15:1', end: 'Luke 16:2' }), 'Luke 15:1–16:2');
});
