'use client';

import React, { useEffect, useState, useRef } from 'react';

type SourceType = 'scripture' | 'history';

interface ReadingDay {
  day: number;
  title: string;
  start: string;
  end: string;
}

interface ReadingPlan {
  id: string;
  name: string;
  days: ReadingDay[];
}

interface TriviaQuestion {
  id: string;
  difficulty: string;
  category: string;
  playful?: boolean;
  sourceType: SourceType;
  learnMore?: string;
  sources?: string[];
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  refStart?: string;
  refEnd?: string;
}

interface TriviaPack {
  id: string;
  questions: TriviaQuestion[];
}

interface DailyQuizPlanDay {
  day: number;
  label?: string;
  questionIds: string[];
}

interface DailyQuizPlanMapping {
  planId: string;
  days: DailyQuizPlanDay[];
}

type QuizLevel = 'easy' | 'medium' | 'hard' | 'mixed';

type Screen =
  | { name: 'home' }
  | { name: 'reading'; day: ReadingDay }
  | {
      name: 'quiz';
      title: string;
      questions: TriviaQuestion[];
      sourceType: SourceType;
    }
  | { name: 'summary'; title: string; total: number; correct: number };

type Ref = { bookId: number; chapter: number; verse: number };
type VerseLine = { chapter: number; verse: number; text: string };

const QUIZ_COUNT_PER_READING = 10;

// ---- Reference + quiz helpers ----

const bookToId: Record<string, number> = {
  genesis: 1,
  exodus: 2,
  leviticus: 3,
  numbers: 4,
  deuteronomy: 5,
  joshua: 6,
  judges: 7,
  ruth: 8,
  '1 samuel': 9,
  '2 samuel': 10,
  '1 kings': 11,
  '2 kings': 12,
  '1 chronicles': 13,
  '2 chronicles': 14,
  ezra: 15,
  nehemiah: 16,
  esther: 17,
  job: 18,
  psalms: 19,
  proverbs: 20,
  ecclesiastes: 21,
  'song of solomon': 22,
  isaiah: 23,
  jeremiah: 24,
  lamentations: 25,
  ezekiel: 26,
  daniel: 27,
  hosea: 28,
  joel: 29,
  amos: 30,
  obadiah: 31,
  jonah: 32,
  micah: 33,
  nahum: 34,
  habakkuk: 35,
  zephaniah: 36,
  haggai: 37,
  zechariah: 38,
  malachi: 39,
  matthew: 40,
  mark: 41,
  luke: 42,
  john: 43,
  acts: 44,
  romans: 45,
  '1 corinthians': 46,
  '2 corinthians': 47,
  galatians: 48,
  ephesians: 49,
  philippians: 50,
  colossians: 51,
  '1 thessalonians': 52,
  '2 thessalonians': 53,
  '1 timothy': 54,
  '2 timothy': 55,
  titus: 56,
  philemon: 57,
  hebrews: 58,
  james: 59,
  '1 peter': 60,
  '2 peter': 61,
  '1 john': 62,
  '2 john': 63,
  '3 john': 64,
  jude: 65,
  revelation: 66,
};

function normalizeBookKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseRef(input: string | undefined): Ref | null {
  if (!input) return null;
  const trimmed = input.trim();
  const pattern = /^\s*(.+?)\s+(\d+):(\d+)\s*$/;
  const match = trimmed.match(pattern);
  if (!match) return null;
  const [, bookName, chStr, vsStr] = match;
  const key = normalizeBookKey(bookName);
  const bookId = bookToId[key];
  const ch = parseInt(chStr, 10);
  const vs = parseInt(vsStr, 10);
  if (!bookId || Number.isNaN(ch) || Number.isNaN(vs)) return null;
  return { bookId, chapter: ch, verse: vs };
}

function isRefInOrAfter(a: Ref, b: Ref): boolean {
  if (a.chapter > b.chapter) return true;
  if (a.chapter < b.chapter) return false;
  return a.verse >= b.verse;
}

function isRefInOrBefore(a: Ref, b: Ref): boolean {
  if (a.chapter < b.chapter) return true;
  if (a.chapter > b.chapter) return false;
  return a.verse <= b.verse;
}

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function todaysReadingDay(plan: ReadingPlan | null): ReadingDay | null {
  if (!plan || !plan.days.length) return null;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diffMs = now.getTime() - startOfYear.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const index = (diffDays - 1) % plan.days.length;
  return plan.days[index];
}

type ScriptureScope = {
  book: string;
  chapter?: number;
};

function questionInScope(q: TriviaQuestion, scope: ScriptureScope): boolean {
  if (!q.refStart) return false;

  const ref = q.refStart.toLowerCase();
  const bookLower = scope.book.toLowerCase();

  if (!ref.startsWith(bookLower + ' ')) return false;

  if (!scope.chapter) return true;

  const chapterPrefix = `${bookLower} ${scope.chapter}:`;
  return ref.startsWith(chapterPrefix);
}

function questionsForScope(
  pack: TriviaPack,
  scope: ScriptureScope,
  count: number,
  difficulty: QuizLevel | null = null,
): TriviaQuestion[] {
  const filtered = pack.questions.filter((q) => questionInScope(q, scope));

  const diffFiltered =
    difficulty && difficulty !== 'mixed'
      ? filtered.filter(
          (q) => q.difficulty.toLowerCase() === difficulty.toLowerCase(),
        )
      : filtered;

  return shuffle(diffFiltered).slice(0, count);
}

function randomQuestions(
  pack: TriviaPack,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' | null,
  sourceType: SourceType,
): TriviaQuestion[] {
  const wantSource = sourceType.toLowerCase();
  const sourceFiltered = pack.questions.filter(
    (q) => (q.sourceType ?? 'scripture').toLowerCase() === wantSource,
  );

  const diffFiltered = difficulty
    ? sourceFiltered.filter(
        (q) => q.difficulty.toLowerCase() === difficulty.toLowerCase(),
      )
    : sourceFiltered;

  const seen = new Set<string>();
  const unique: TriviaQuestion[] = [];
  for (const q of diffFiltered) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      unique.push(q);
    }
  }

  const maxCount = Math.min(count, unique.length);
  if (maxCount <= 0) return [];

  const targetPlayful =
    maxCount >= 10 ? Math.min(2, maxCount) : maxCount >= 5 ? 1 : 0;

  const playfulQs = shuffle(unique.filter((q) => q.playful));
  const seriousQs = shuffle(unique.filter((q) => !q.playful));

  let chosen: TriviaQuestion[] = [];
  chosen = chosen.concat(
    seriousQs.slice(0, Math.max(0, maxCount - targetPlayful)),
  );

  const remaining = maxCount - chosen.length;
  if (remaining > 0) {
    chosen = chosen.concat(
      playfulQs.slice(0, Math.min(targetPlayful, remaining)),
    );
  }

  if (chosen.length < maxCount) {
    const usedIds = new Set(chosen.map((q) => q.id));
    const remainder = shuffle(unique.filter((q) => !usedIds.has(q.id)));
    chosen = chosen.concat(remainder.slice(0, maxCount - chosen.length));
  }

  return shuffle(chosen);
}

// questions whose ref range contains a specific verse
function questionsForVerseOfDay(
  pack: TriviaPack,
  verseRefStr: string,
  count: number,
): TriviaQuestion[] {
  const verseRef = parseRef(verseRefStr);
  if (!verseRef) return [];

  const matches: TriviaQuestion[] = [];
  for (const q of pack.questions) {
    const qs = parseRef(q.refStart);
    const qe = parseRef(q.refEnd);
    if (!qs || !qe) continue;
    if (qs.bookId !== verseRef.bookId || qe.bookId !== verseRef.bookId)
      continue;
    if (!isRefInOrBefore(qs, verseRef)) continue;
    if (!isRefInOrAfter(qe, verseRef)) continue;
    matches.push(q);
  }

  if (!matches.length) return [];
  return shuffle(matches).slice(0, count);
}

function availableCount(
  pack: TriviaPack | null,
  level: QuizLevel,
  sourceType: SourceType,
): number {
  if (!pack) return 0;
  const wantSource = sourceType.toLowerCase();
  const base = pack.questions.filter(
    (q) => (q.sourceType ?? 'scripture').toLowerCase() === wantSource,
  );

  const filtered =
    level === 'mixed'
      ? base
      : base.filter((q) => q.difficulty.toLowerCase() === level);

  const ids = new Set(filtered.map((q) => q.id));
  return ids.size;
}

// ---- Book summaries & reflections (optional extras) ----

interface BookSummary {
  title: string;
  summary: string;
  keyThemes?: string[];
  keyVerses?: string[];
}

interface ReflectionEntry {
  title: string;
  verseFocus?: string;
  prompts?: string[];
  prayerSuggestion?: string;
}

type BookSummaryMap = Record<string, BookSummary>;
type ReflectionMap = Record<string, ReflectionEntry>;

let cachedBookSummaries: BookSummaryMap | null = null;
let cachedReflections: ReflectionMap | null = null;
let summariesLoaded = false;
let reflectionsLoaded = false;

async function loadBookSummaries(): Promise<BookSummaryMap> {
  if (summariesLoaded && cachedBookSummaries) return cachedBookSummaries;
  try {
    const res = await fetch('/data/book_summaries_en_v1.json');
    if (!res.ok) throw new Error('Failed to load book summaries');
    cachedBookSummaries = (await res.json()) as BookSummaryMap;
    summariesLoaded = true;
    return cachedBookSummaries;
  } catch {
    summariesLoaded = true;
    cachedBookSummaries = {};
    return {};
  }
}

async function loadReflections(): Promise<ReflectionMap> {
  if (reflectionsLoaded && cachedReflections) return cachedReflections;
  try {
    const res = await fetch('/data/reflections_en_v1.json');
    if (!res.ok) throw new Error('Failed to load reflections');
    cachedReflections = (await res.json()) as ReflectionMap;
    reflectionsLoaded = true;
    return cachedReflections;
  } catch {
    reflectionsLoaded = true;
    cachedReflections = {};
    return {};
  }
}

function parseBookAndChapterFromTitle(title: string): {
  book?: string;
  chapterLabel?: string;
} {
  const m = title.match(/Quiz on\s+(.+)/i);
  if (!m) return {};
  const rest = m[1].trim();
  const parts = rest.split(/\s+/);
  if (!parts.length) return {};
  const book = parts[0];
  const remainder = rest.slice(book.length).trim();
  const chapterLabel = remainder || undefined;
  return { book, chapterLabel };
}

function makeReflectionKey(title: string): string | null {
  const m = title.match(/Quiz on\s+([A-Za-z0-9 ]+)/i);
  if (!m) return null;
  return m[1].trim();
}

function SummaryExtras({ quizTitle }: { quizTitle: string }) {
  const [bookSummary, setBookSummary] = React.useState<BookSummary | null>(
    null,
  );
  const [reflection, setReflection] = React.useState<ReflectionEntry | null>(
    null,
  );

  React.useEffect(() => {
    let active = true;

    (async () => {
      const { book } = parseBookAndChapterFromTitle(quizTitle);

      if (book) {
        const summaries = await loadBookSummaries();
        if (active && summaries[book]) {
          setBookSummary(summaries[book]);
        }
      }

      const key = makeReflectionKey(quizTitle);
      if (key) {
        const refs = await loadReflections();
        if (active && refs[key]) {
          setReflection(refs[key]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [quizTitle]);

  if (!bookSummary && !reflection) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {bookSummary && (
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            padding: 12,
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
          >
            Big picture of {bookSummary.title}
          </div>
          <div
            style={{ fontSize: 13, color: '#111827', marginBottom: 4 }}
          >
            {bookSummary.summary}
          </div>
          {bookSummary.keyThemes && bookSummary.keyThemes.length > 0 && (
            <div
              style={{ fontSize: 12, color: '#374151', marginTop: 4 }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                Key themes:
              </div>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {bookSummary.keyThemes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {bookSummary.keyVerses && bookSummary.keyVerses.length > 0 && (
            <div
              style={{ fontSize: 12, color: '#374151', marginTop: 4 }}
            >
              <span style={{ fontWeight: 600 }}>Key verses:</span>{' '}
              {bookSummary.keyVerses.join(', ')}
            </div>
          )}
        </div>
      )}

      {reflection && (
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            padding: 12,
            backgroundColor: '#fefce8',
          }}
        >
          <div
            style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
          >
            Reflect &amp; pray
          </div>
          {reflection.verseFocus && (
            <div
              style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}
            >
              Focus passage: {reflection.verseFocus}
            </div>
          )}
          {reflection.prompts && reflection.prompts.length > 0 && (
            <ul
              style={{
                paddingLeft: 20,
                margin: 0,
                fontSize: 13,
                color: '#111827',
              }}
            >
              {reflection.prompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {reflection.prayerSuggestion && (
            <div
              style={{ fontSize: 12, color: '#374151', marginTop: 6 }}
            >
              Suggested prayer: {reflection.prayerSuggestion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Fixed summary with safe math ----

function FixedSummaryScreen(props: {
  title: string;
  total: number;
  correct: number;
  onBackHome: () => void;
}) {
  const rawCorrect = typeof props.correct === 'number' ? props.correct : 0;
  const rawTotal = typeof props.total === 'number' ? props.total : 0;

  const total = Math.max(rawCorrect, rawTotal);
  const correct = Math.min(rawCorrect, total);
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const isPerfect = percent === 100;

  const cardStyle = isPerfect
    ? {
        padding: 20,
        borderRadius: 20,
        background:
          'linear-gradient(135deg, rgba(34,197,94,0.98), rgba(16,185,129,0.98))',
        color: 'white',
        boxShadow:
          '0 25px 35px rgba(22,163,74,0.45), 0 10px 10px rgba(22,163,74,0.45)',
        border: '1px solid rgba(22,163,74,0.9)',
      }
    : {
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        color: '#111827',
      };

  return (
    <div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          marginBottom: 4,
          color: '#111827',
        }}
      >
        Quiz Summary
      </h2>
      <p
        className="btc-text-muted"
        style={{ marginBottom: 16, fontSize: 14 }}
      >
        {props.title}
      </p>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        {isPerfect && <PerfectConfetti />}
        <div style={cardStyle}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            {correct}/{total}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {percent}% correct
          </div>
          {isPerfect ? (
            <>
              <div style={{ fontSize: 16, marginBottom: 6 }}>
                Perfect score! Beautiful work—every answer was spot on.
              </div>
              <div style={{ fontSize: 13 }}>
                Keep planting God&apos;s Word deeply in your heart—He rewards
                those who diligently seek Him (Hebrews 11:6).
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 14,
                color: '#374151',
              }}
            >
              Every question is another seed of Scripture planted—keep going!
              Nice progress! God rewards those who diligently seek Him
              (Hebrews 11:6).
            </div>
          )}
        </div>
      </div>

      <SummaryExtras quizTitle={props.title} />

      <button
        onClick={props.onBackHome}
        style={{
          padding: '10px 16px',
          borderRadius: 999,
          border: 'none',
          backgroundColor: '#111827',
          marginTop: 24,
          color: 'white',
          cursor: 'pointer',
        }}
      >
        Back to Home
      </button>
    </div>
  );
}

function PerfectConfetti() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: -8,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* top-left burst */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 8,
          height: 12,
          borderRadius: 3,
          backgroundColor: '#f97316',
          boxShadow:
            '24px 6px #22c55e, 64px -8px #facc15, 120px 4px #38bdf8, 180px -10px #ec4899, 230px 2px #a855f7',
        }}
      />
      {/* bottom-right burst */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          right: -8,
          width: 8,
          height: 12,
          borderRadius: 3,
          backgroundColor: '#22c55e',
          transform: 'rotate(18deg)',
          boxShadow:
            '-24px -8px #facc15, -70px 4px #38bdf8, -130px -12px #ec4899, -190px 6px #a855f7',
        }}
      />
    </div>
  );
}

// ---- Root page ----

export default function PlayPage() {
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [pack, setPack] = useState<TriviaPack | null>(null);
  const [dailyQuizMap, setDailyQuizMap] =
    useState<DailyQuizPlanMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [planRes, packRes] = await Promise.all([
          fetch('/data/reading_plan_en_v1.json'),
          fetch('/packs/trivia_core_en_v1.json'),
        ]);

        if (!planRes.ok)
          throw new Error(
            `Failed to load reading plan: ${planRes.status}`,
          );
        if (!packRes.ok)
          throw new Error(
            `Failed to load trivia pack: ${packRes.status}`,
          );

        const planJson = (await planRes.json()) as ReadingPlan;
        const packJson = (await packRes.json()) as TriviaPack;

        let mapping: DailyQuizPlanMapping | null = null;
        try {
          const mapRes = await fetch('/daily_quizzes_gospels_30.json');
          if (mapRes.ok) {
            mapping = (await mapRes.json()) as DailyQuizPlanMapping;
          }
        } catch {
          // optional
        }

        if (!cancelled) {
          setPlan(planJson);
          setPack(packJson);
          setDailyQuizMap(mapping);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Unknown error loading data',
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todaysReadingDay(plan);
  const verseOfDay = today ? today.start : null;

  function startQuiz(config: {
    title: string;
    count: number;
    level: QuizLevel;
    sourceType: SourceType;
  }) {
    if (!pack) return;
    const difficulty: 'easy' | 'medium' | 'hard' | null =
      config.level === 'mixed' ? null : config.level;
    const questions = randomQuestions(
      pack,
      config.count,
      difficulty,
      config.sourceType,
    );
    setScreen({
      name: 'quiz',
      title: config.title,
      questions,
      sourceType: config.sourceType,
    });
  }

  function startReadingQuiz(day: ReadingDay) {
    if (!pack) return;

    let questions: TriviaQuestion[] = [];

    if (plan && dailyQuizMap && dailyQuizMap.planId === plan.id) {
      const match = dailyQuizMap.days?.find((d) => d.day === day.day);
      if (match && match.questionIds?.length) {
        const byId = new Map<string, TriviaQuestion>();
        for (const q of pack.questions) byId.set(q.id, q);
        questions = match.questionIds
          .map((id) => byId.get(id))
          .filter((q): q is TriviaQuestion => !!q);
      }
    }

    if (!questions.length) {
      const s = parseRef(day.start);
      const e = parseRef(day.end);
      if (!s || !e || s.bookId !== e.bookId) {
        window.alert('Unable to map questions for this reading yet.');
        return;
      }

      let startRef = s;
      let endRef = e;
      if (
        startRef.chapter > endRef.chapter ||
        (startRef.chapter === endRef.chapter &&
          startRef.verse > endRef.verse)
      ) {
        startRef = e;
        endRef = s;
      }

      const inRange: TriviaQuestion[] = [];
      for (const q of pack.questions) {
        const qs = parseRef(q.refStart);
        const qe = parseRef(q.refEnd);
        if (!qs || !qe) continue;
        if (qs.bookId !== startRef.bookId || qe.bookId !== startRef.bookId)
          continue;
        if (!isRefInOrAfter(qs, startRef)) continue;
        if (!isRefInOrBefore(qe, endRef)) continue;
        inRange.push(q);
      }

      if (!inRange.length) {
        window.alert('No quiz is available for this reading yet.');
        return;
      }

      questions = shuffle(inRange);
    }

    const limited = questions.slice(0, QUIZ_COUNT_PER_READING);
    if (!limited.length) {
      window.alert('No quiz is available for this reading yet.');
      return;
    }

    const title = `Quiz on ${day.title}`;
    setScreen({
      name: 'quiz',
      title,
      questions: limited,
      sourceType: 'scripture',
    });
  }

  function startVerseQuiz() {
    if (!pack || !verseOfDay) {
      window.alert('Verse of the day is still loading.');
      return;
    }

    const verseQuestions = questionsForVerseOfDay(pack, verseOfDay, 3);
    if (!verseQuestions.length) {
      window.alert('No verse-of-the-day questions are available yet.');
      return;
    }

    setScreen({
      name: 'quiz',
      title: `Verse of the day: ${verseOfDay}`,
      questions: verseQuestions,
      sourceType: 'scripture',
    });
  }

  function showSummary(title: string, total: number, correct: number) {
    setScreen({ name: 'summary', title, total, correct });
  }

  return (
    <div className="btc-root">
      <div className="btc-card">
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h1>Bible Trivia Coach</h1>
            <p className="btc-text-muted">Loading questions…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '1rem' }}>
            <h1>Bible Trivia Coach</h1>
            <p
              style={{
                color: '#b91c1c',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Could not load data.
            </p>
            <p
              style={{
                color: '#374151',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
              }}
            >
              {error}
            </p>
          </div>
        )}

        {!loading && !error && screen.name === 'home' && (
          <HomeScreen
            today={today}
            pack={pack}
            plan={plan}
            verseOfDay={verseOfDay}
            onOpenDailyReading={() => {
              if (today) setScreen({ name: 'reading', day: today });
            }}
            onOpenReadingForDay={(day) => {
              setScreen({ name: 'reading', day });
            }}
            onStartDailyQuiz={() =>
              startQuiz({
                title: 'Daily Quiz',
                count: 5,
                level: 'mixed',
                sourceType: 'scripture',
              })
            }
            onStartVerseQuiz={startVerseQuiz}
            onStartQuickQuiz={() =>
              startQuiz({
                title: 'Quick Quiz',
                count: 10,
                level: 'mixed',
                sourceType: 'scripture',
              })
            }
            onStartHistoryQuiz={() =>
              startQuiz({
                title: 'Bible History',
                count: 10,
                level: 'mixed',
                sourceType: 'history',
              })
            }
            onStartLevelQuiz={(level, count) =>
              startQuiz({
                title:
                  level.charAt(0).toUpperCase() + level.slice(1) + ' Quiz',
                count,
                level,
                sourceType: 'scripture',
              })
            }
            onStartBookQuiz={(book, chapter) => {
              if (!pack) {
                window.alert('Questions are still loading.');
                return;
              }
              const scope =
                chapter && chapter > 0 ? { book, chapter } : { book };
              const qs = questionsForScope(pack, scope, 10, 'mixed');
              if (!qs.length) {
                const label =
                  chapter && chapter > 0 ? book + ' ' + chapter : book;
                window.alert(
                  'No questions available yet for ' + label + '.',
                );
                return;
              }
              const title =
                chapter && chapter > 0
                  ? 'Quiz on ' + book + ' ' + chapter
                  : 'Quiz on ' + book;
              setScreen({
                name: 'quiz',
                title,
                questions: qs,
                sourceType: 'scripture',
              });
            }}
          />
        )}

        {!loading && !error && screen.name === 'reading' && (
          <DailyReadingScreen
            day={screen.day}
            onBack={() => setScreen({ name: 'home' })}
            onStartQuiz={() => startReadingQuiz(screen.day)}
          />
        )}

        {!loading && !error && screen.name === 'quiz' && (
          <QuizScreen
            title={screen.title}
            questions={screen.questions}
            onBack={() => setScreen({ name: 'home' })}
            onFinished={(correct, total) =>
              showSummary(screen.title, total, correct)
            }
          />
        )}

        {!loading && !error && screen.name === 'summary' && (
          <FixedSummaryScreen
            title={screen.title}
            total={screen.total}
            correct={screen.correct}
            onBackHome={() => setScreen({ name: 'home' })}
          />
        )}
      </div>
    </div>
  );
}

// ---- Home ----

function HomeScreen(props: {
  today: ReadingDay | null;
  pack: TriviaPack | null;
  plan: ReadingPlan | null;
  verseOfDay: string | null;
  onOpenDailyReading: () => void;
  onOpenReadingForDay: (day: ReadingDay) => void;
  onStartDailyQuiz: () => void;
  onStartVerseQuiz: () => void;
  onStartQuickQuiz: () => void;
  onStartHistoryQuiz: () => void;
  onStartLevelQuiz: (level: QuizLevel, count: number) => void;
  onStartBookQuiz: (book: string, chapter?: number) => void;
}) {
  const { today, pack } = props;
  const easyCount = availableCount(pack, 'easy', 'scripture');
  const medCount = availableCount(pack, 'medium', 'scripture');
  const hardCount = availableCount(pack, 'hard', 'scripture');
  const mixedCount = availableCount(pack, 'mixed', 'scripture');

  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<string>('');

  const books = [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Numbers',
    'Deuteronomy',
    'Joshua',
    'Judges',
    'Ruth',
    '1 Samuel',
    '2 Samuel',
    '1 Kings',
    '2 Kings',
    '1 Chronicles',
    '2 Chronicles',
    'Ezra',
    'Nehemiah',
    'Esther',
    'Job',
    'Psalms',
    'Proverbs',
    'Ecclesiastes',
    'Song of Solomon',
    'Isaiah',
    'Jeremiah',
    'Lamentations',
    'Ezekiel',
    'Daniel',
    'Hosea',
    'Joel',
    'Amos',
    'Obadiah',
    'Jonah',
    'Micah',
    'Nahum',
    'Habakkuk',
    'Zephaniah',
    'Haggai',
    'Zechariah',
    'Malachi',
    'Matthew',
    'Mark',
    'Luke',
    'John',
    'Acts',
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
    'Revelation',
  ];

  const bookMaxChapters: Record<string, number> = {
    Genesis: 50,
    Exodus: 40,
    Leviticus: 27,
    Numbers: 36,
    Deuteronomy: 34,
    Joshua: 24,
    Judges: 21,
    Ruth: 4,
    '1 Samuel': 31,
    '2 Samuel': 24,
    '1 Kings': 22,
    '2 Kings': 25,
    '1 Chronicles': 29,
    '2 Chronicles': 36,
    Ezra: 10,
    Nehemiah: 13,
    Esther: 10,
    Job: 42,
    Psalms: 150,
    Proverbs: 31,
    Ecclesiastes: 12,
    'Song of Solomon': 8,
    Isaiah: 66,
    Jeremiah: 52,
    Lamentations: 5,
    Ezekiel: 48,
    Daniel: 12,
    Hosea: 14,
    Joel: 3,
    Amos: 9,
    Obadiah: 1,
    Jonah: 4,
    Micah: 7,
    Nahum: 3,
    Habakkuk: 3,
    Zephaniah: 3,
    Haggai: 2,
    Zechariah: 14,
    Malachi: 4,
    Matthew: 28,
    Mark: 16,
    Luke: 24,
    John: 21,
    Acts: 28,
    Romans: 16,
    '1 Corinthians': 16,
    '2 Corinthians': 13,
    Galatians: 6,
    Ephesians: 6,
    Philippians: 4,
    Colossians: 4,
    '1 Thessalonians': 5,
    '2 Thessalonians': 3,
    '1 Timothy': 6,
    '2 Timothy': 4,
    Titus: 3,
    Philemon: 1,
    Hebrews: 13,
    James: 5,
    '1 Peter': 5,
    '2 Peter': 3,
    '1 John': 5,
    '2 John': 1,
    '3 John': 1,
    Jude: 1,
    Revelation: 22,
  };

  const maxChapters = bookMaxChapters[selectedBook] ?? 0;

  return (
    <div>
      <h1>Bible Trivia Coach</h1>
      <p className="btc-text-muted" style={{ marginBottom: 20 }}>
        Daily Scripture and Bible history quizzes.
      </p>

      <Section title="Today" tint="#dbeafe">
        {today && (
          <Row
            title={`Daily Reading: ${today.title}`}
            subtitle={`${today.start} – ${today.end}`}
            onClick={props.onOpenDailyReading}
          />
        )}
        {props.verseOfDay && (
          <Row
            title={`Verse of the day: ${props.verseOfDay}`}
            subtitle="Short 3‑question quiz on this verse"
            onClick={props.onStartVerseQuiz}
          />
        )}
        {props.plan && (
          <Row
            title="Choose another day in this plan"
            subtitle="Open any reading from the full‑Bible plan"
            onClick={() => {
              const plan = props.plan;
              if (!plan) {
                window.alert('Reading plan is not loaded yet.');
                return;
              }
              const maxDay = plan.days.length;
              if (!maxDay) {
                window.alert('Reading plan is not loaded yet.');
                return;
              }
              const input = window.prompt(
                `Enter a day number between 1 and ${maxDay} to open that reading.`,
              );
              if (!input) return;
              const num = Number(input);
              if (!Number.isFinite(num) || num < 1 || num > maxDay) {
                window.alert('Please enter a valid day number.');
                return;
              }
              const chosen =
                plan.days.find((d) => d.day === num) ||
                plan.days[num - 1];
              if (!chosen) {
                window.alert('Could not find that reading day.');
                return;
              }
              props.onOpenReadingForDay(chosen);
            }}
          />
        )}
        <Row
          title="Daily Quiz (5)"
          subtitle="Mixed Scripture questions"
          onClick={props.onStartDailyQuiz}
        />
      </Section>

      <Section title="Quick" tint="#fef3c7">
        <Row
          title="Quick Quiz (10)"
          subtitle="10 mixed questions"
          onClick={props.onStartQuickQuiz}
        />
      </Section>

      <Section title="By Book" tint="#e0f2fe">
        <div style={{ padding: '12px 16px' }}>
          <label style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>
            Choose a book to quiz on
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              style={{
                flex: 1,
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                padding: '6px 10px',
                fontSize: 14,
              }}
            >
              {books.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              style={{
                width: 150,
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                padding: '6px 10px',
                fontSize: 14,
              }}
            >
              <option value="">Whole book</option>
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(
                (ch) => (
                  <option key={ch} value={String(ch)}>
                    Chapter {ch}
                  </option>
                ),
              )}
            </select>
            <button
              onClick={() => {
                const trimmed = selectedChapter.trim();
                const ch = trimmed ? Number(trimmed) : undefined;
                const safeChapter = ch && ch > 0 ? ch : undefined;
                const max = bookMaxChapters[selectedBook];
                if (safeChapter && max && safeChapter > max) {
                  window.alert(
                    selectedBook + ' only has ' + max + ' chapters.',
                  );
                  return;
                }
                props.onStartBookQuiz(selectedBook, safeChapter);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Start
            </button>
          </div>
        </div>
      </Section>

      <Section title="Bible History" tint="#e0e7ff">
        <Row
          title="Bible History (10)"
          subtitle="History‑mode questions"
          onClick={props.onStartHistoryQuiz}
        />
      </Section>

      <Section title="Levels (Strict)" tint="#dcfce7">
        {easyCount > 0 ? (
          <Row
            title={`Easy (${easyCount} available)`}
            subtitle="Fast and friendly."
            onClick={() => props.onStartLevelQuiz('easy', Math.min(10, easyCount))}
          />
        ) : (
          <DisabledRow title="Easy (coming soon)" />
        )}

        {medCount > 0 ? (
          <Row
            title={`Medium (${medCount} available)`}
            subtitle="A little deeper."
            onClick={() => props.onStartLevelQuiz('medium', Math.min(10, medCount))}
          />
        ) : (
          <DisabledRow title="Medium (coming soon)" />
        )}

        {hardCount > 0 ? (
          <Row
            title={`Hard (${hardCount} available)`}
            subtitle="Challenge mode."
            onClick={() => props.onStartLevelQuiz('hard', Math.min(10, hardCount))}
          />
        ) : (
          <DisabledRow title="Hard (coming soon)" />
        )}

        {mixedCount > 0 && (
          <Row
            title={`Mixed (${mixedCount} available)`}
            subtitle="A mix of everything."
            onClick={() => props.onStartLevelQuiz('mixed', Math.min(10, mixedCount))}
          />
        )}
      </Section>
    </div>
  );
}

function Section(props: {
  title: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 18,
        marginBottom: 6,
        padding: 14,
        borderRadius: 18,
        backgroundColor: props.tint,
      }}
    >
      <h2
        style={{
          fontSize: 'var(--btc-heading-md)',
          fontWeight: 700,
          letterSpacing: 0.08,
          marginBottom: 10,
        }}
      >
        {props.title}
      </h2>
      <div>{props.children}</div>
    </section>
  );
}

function Row(props: {
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        backgroundColor: '#ffffff',
        borderRadius: 999,
        padding: '11px 16px',
        border: '1px solid #9ca3af',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        cursor: 'pointer',
        color: '#111827',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{props.title}</div>
        {props.subtitle && (
          <div style={{ fontSize: 13, color: '#4b5563' }}>
            {props.subtitle}
          </div>
        )}
      </div>
      <span style={{ color: '#4b5563', fontSize: 18 }}>›</span>
    </button>
  );
}

function DisabledRow(props: { title: string }) {
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#f3f4f6',
        borderRadius: 999,
        padding: '10px 16px',
        border: '1px dashed #9ca3af',
        marginBottom: 10,
        color: '#6b7280',
        fontSize: 14,
      }}
    >
      {props.title}
    </div>
  );
}

// ---- Daily Reading + TTS ----

function DailyReadingScreen(props: {
  day: ReadingDay;
  onBack: () => void;
  onStartQuiz: () => void;
}) {
  const { day } = props;
  const [lines, setLines] = useState<VerseLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVerseIdx, setActiveVerseIdx] = useState<number | null>(
    null,
  );
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (activeVerseIdx == null) return;
    const el = verseRefs.current[activeVerseIdx];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeVerseIdx]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/passage?start=${encodeURIComponent(
          day.start,
        )}&end=${encodeURIComponent(day.end)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setLines(data.lines ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load passage',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [day.start, day.end]);

  function stopSpeaking() {
    const synth = synthRef.current;
    if (synth) synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveVerseIdx(null);
    setActiveWordIdx(null);
  }

  function pauseOrResume() {
    const synth = synthRef.current;
    if (!synth || !isSpeaking) return;
    if (!isPaused) {
      synth.pause();
      setIsPaused(true);
    } else {
      synth.resume();
      setIsPaused(false);
    }
  }

  function startSpeaking() {
    if (typeof window === 'undefined') return;
    const synth = synthRef.current;
    if (!synth || !('SpeechSynthesisUtterance' in window)) return;
    if (!lines.length) return;

    synth.cancel();
    setIsSpeaking(true);
    setIsPaused(false);
    setActiveVerseIdx(null);
    setActiveWordIdx(null);

    lines.forEach((v, verseIdx) => {
      const utter = new SpeechSynthesisUtterance(v.text);
      const boundaries: { start: number; end: number }[] = [];
      const wordRegex = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = wordRegex.exec(v.text)) !== null) {
        boundaries.push({ start: m.index, end: m.index + m[0].length });
      }

      utter.onstart = () => {
        setActiveVerseIdx(verseIdx);
        setActiveWordIdx(0);
      };

      utter.onboundary = (event: SpeechSynthesisEvent) => {
        const charIndex =
          typeof event.charIndex === 'number' ? event.charIndex : 0;
        if (!boundaries.length) return;
        let wIdx = 0;
        for (let i = 0; i < boundaries.length; i++) {
          const b = boundaries[i];
          if (charIndex >= b.start && charIndex < b.end) {
            wIdx = i;
            break;
          }
          if (i === boundaries.length - 1 && charIndex >= b.end) {
            wIdx = i;
          }
        }
        setActiveWordIdx(wIdx);
      };

      utter.onend = () => {
        if (verseIdx === lines.length - 1) {
          setIsSpeaking(false);
          setIsPaused(false);
          setActiveVerseIdx(null);
          setActiveWordIdx(null);
        }
      };

      synth.speak(utter);
    });
  }

  return (
    <div>
      <BackButton onClick={props.onBack} />
      <h2>Daily Reading</h2>
      <p style={{ color: '#4b5563', marginBottom: 8 }}>{day.title}</p>
      <p className="btc-text-muted" style={{ marginBottom: 12 }}>
        {day.start} – {day.end}
      </p>

      {loading && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#eef2ff',
            color: '#111827',
          }}
        >
          Loading passage…
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
          }}
        >
          Couldn&apos;t load passage: {error}
        </div>
      )}

      {!loading && !error && lines.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#f9fafb',
            maxHeight: '60vh',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
          }}
        >
          {lines.map((v, idx) => {
            const tokens = v.text.match(/\S+|\s+/g) ?? [];
            let wordCounter = 0;
            return (
              <div
                key={`${v.chapter}-${v.verse}-${idx}`}
                ref={(el) => {
                  verseRefs.current[idx] = el;
                }}
                style={{
                  marginBottom: 6,
                  fontSize: 15,
                  color: '#111827',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    marginRight: 6,
                  }}
                >
                  {v.chapter}:{v.verse}
                </span>
                {tokens.map((tok, tIdx) => {
                  const isSpace = /^\s+$/.test(tok);
                  if (isSpace) return <span key={tIdx}>{tok}</span>;
                  const thisWordIdx = wordCounter++;
                  const highlighted =
                    isSpeaking &&
                    activeVerseIdx === idx &&
                    activeWordIdx === thisWordIdx;
                  return (
                    <span
                      key={tIdx}
                      style={{
                        backgroundColor: highlighted ? '#bfdbfe' : undefined,
                        borderRadius: highlighted ? 4 : undefined,
                      }}
                    >
                      {tok}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={startSpeaking}
            disabled={isSpeaking && !isPaused}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor:
                isSpeaking && !isPaused ? '#e5e7eb' : '#f9fafb',
              cursor: isSpeaking && !isPaused ? 'default' : 'pointer',
            }}
          >
            Listen
          </button>
          <button
            onClick={pauseOrResume}
            disabled={!isSpeaking}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              cursor: !isSpeaking ? 'default' : 'pointer',
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={stopSpeaking}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        </div>

        <button
          onClick={props.onStartQuiz}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            border: 'none',
            backgroundColor: '#2563eb',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Quiz on today&apos;s reading
        </button>
      </div>
    </div>
  );
}

// ---- Quiz + inline passage ----

function QuizScreen(props: {
  title: string;
  questions: TriviaQuestion[];
  onBack: () => void;
  onFinished: (correct: number, total: number) => void;
}) {
  const { title, questions } = props;
  const verseMatch = title.match(/^Verse of the day:\s*(.+)$/);
  const verseRefStr = verseMatch ? verseMatch[1] : null;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [showPassage, setShowPassage] = useState(false);
  const [passageRef, setPassageRef] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  function handleSelect(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    setShowFeedback(true);
    const isCorrect = optionIndex === q.correctIndex;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      const hasRef =
        q.refStart &&
        q.refEnd &&
        q.refStart.trim() !== '' &&
        q.refEnd.trim() !== '';
      if (hasRef && q.refStart && q.refEnd) {
        setPassageRef({ start: q.refStart, end: q.refEnd });
        setShowPassage(true);
      }
    }
  }

  function handleNext() {
    if (isLast) {
      props.onFinished(correctCount, questions.length);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setShowFeedback(false);
      setShowPassage(false);
      setPassageRef(null);
    }
  }

  return (
    <div style={{ color: '#111827' }}>
      <BackButton onClick={props.onBack} />
      <h2>{title}</h2>
      <div
        style={{
          fontSize: 13,
          color: '#4b5563',
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span>
          Score: {correctCount}/{questions.length}
        </span>
      </div>

      {verseRefStr && (
        <div style={{ marginBottom: 16 }}>
          <PassageInline
            refStart={verseRefStr}
            refEnd={verseRefStr}
            onClose={() => {}}
          />
        </div>
      )}

      <div
        style={{
          marginBottom: 16,
          padding: 14,
          borderRadius: 16,
          backgroundColor: '#ffffff',
          border: '1px solid #9ca3af',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {q.text}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === q.correctIndex;
          let bg = '#ffffff';
          let border = '1px solid #9ca3af';

          if (selected !== null) {
            if (isSelected && isCorrect) {
              bg = '#bbf7d0';
              border = '1px solid #16a34a';
            } else if (isSelected && !isCorrect) {
              bg = '#fecaca';
              border = '1px solid #dc2626';
            } else if (showFeedback && isCorrect) {
              bg = '#dcfce7';
              border = '1px solid #16a34a';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 12,
                backgroundColor: bg,
                border,
                cursor: selected === null ? 'pointer' : 'default',
                color: '#111827',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontWeight: 600,
              marginBottom: 4,
              color: selected === q.correctIndex ? '#15803d' : '#b91c1c',
            }}
          >
            {selected === q.correctIndex ? 'Correct!' : 'Not quite'}
          </div>
          <div style={{ fontSize: 14, color: '#111827' }}>
            {q.explanation}
          </div>
        </div>
      )}

      {showPassage && passageRef && (
        <PassageInline
          refStart={passageRef.start}
          refEnd={passageRef.end}
          onClose={() => setShowPassage(false)}
        />
      )}

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <button
          onClick={handleNext}
          disabled={selected === null}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            backgroundColor: selected === null ? '#9ca3af' : '#2563eb',
            color: 'white',
            cursor: selected === null ? 'default' : 'pointer',
          }}
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ---- Inline passage with TTS + auto-scroll ----

function PassageInline(props: {
  refStart: string;
  refEnd: string;
  onClose: () => void;
}) {
  const { refStart, refEnd, onClose } = props;
  const [lines, setLines] = useState<VerseLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeVerseIdx, setActiveVerseIdx] = useState<number | null>(
    null,
  );
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (activeVerseIdx == null) return;
    const el = verseRefs.current[activeVerseIdx];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeVerseIdx]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/passage?start=${encodeURIComponent(
          refStart,
        )}&end=${encodeURIComponent(refEnd)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setLines(data.lines ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load passage',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refStart, refEnd]);

  function stopSpeaking() {
    const synth = synthRef.current;
    if (synth) synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveVerseIdx(null);
    setActiveWordIdx(null);
  }

  function pauseOrResume() {
    const synth = synthRef.current;
    if (!synth || !isSpeaking) return;
    if (!isPaused) {
      synth.pause();
      setIsPaused(true);
    } else {
      synth.resume();
      setIsPaused(false);
    }
  }

  function startSpeaking() {
    if (typeof window === 'undefined') return;
    const synth = synthRef.current;
    if (!synth || !('SpeechSynthesisUtterance' in window)) return;
    if (!lines.length) return;

    synth.cancel();
    setIsSpeaking(true);
    setIsPaused(false);
    setActiveVerseIdx(null);
    setActiveWordIdx(null);

    lines.forEach((v, verseIdx) => {
      const utter = new SpeechSynthesisUtterance(v.text);
      const boundaries: { start: number; end: number }[] = [];
      const wordRegex = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = wordRegex.exec(v.text)) !== null) {
        boundaries.push({ start: m.index, end: m.index + m[0].length });
      }

      utter.onstart = () => {
        setActiveVerseIdx(verseIdx);
        setActiveWordIdx(0);
      };

      utter.onboundary = (event: SpeechSynthesisEvent) => {
        const charIndex =
          typeof event.charIndex === 'number' ? event.charIndex : 0;
        if (!boundaries.length) return;
        let wIdx = 0;
        for (let i = 0; i < boundaries.length; i++) {
          const b = boundaries[i];
          if (charIndex >= b.start && charIndex < b.end) {
            wIdx = i;
            break;
          }
          if (i === boundaries.length - 1 && charIndex >= b.end) {
            wIdx = i;
          }
        }
        setActiveWordIdx(wIdx);
      };

      utter.onend = () => {
        if (verseIdx === lines.length - 1) {
          setIsSpeaking(false);
          setIsPaused(false);
          setActiveVerseIdx(null);
          setActiveWordIdx(null);
        }
      };

      synth.speak(utter);
    });
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
          >
            Read a related passage about Scripture
          </div>
          <div style={{ fontSize: 12, color: '#4b5563' }}>
            {refStart} – {refEnd}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={startSpeaking}
            disabled={isSpeaking && !isPaused}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor:
                isSpeaking && !isPaused ? '#e5e7eb' : '#ffffff',
              cursor: isSpeaking && !isPaused ? 'default' : 'pointer',
              fontSize: 12,
            }}
          >
            Play
          </button>
          <button
            onClick={pauseOrResume}
            disabled={!isSpeaking}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              cursor: !isSpeaking ? 'default' : 'pointer',
              fontSize: 12,
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={stopSpeaking}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Stop
          </button>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              fontSize: 16,
              cursor: 'pointer',
              padding: 2,
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div
        style={{
          maxHeight: '30vh',
          overflowY: 'auto',
        }}
      >
        {loading && (
          <div style={{ fontSize: 13, color: '#4b5563' }}>
            Loading passage…
          </div>
        )}
        {error && !loading && (
          <div style={{ fontSize: 13, color: '#b91c1c' }}>
            Couldn&apos;t load passage: {error}
          </div>
        )}
        {!loading &&
          !error &&
          lines.map((v, idx) => {
            const tokens = v.text.match(/\S+|\s+/g) ?? [];
            let wordCounter = 0;
            return (
              <div
                key={`${v.chapter}-${v.verse}-${idx}`}
                ref={(el) => {
                  verseRefs.current[idx] = el;
                }}
                style={{ marginBottom: 4, fontSize: 13, color: '#111827' }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    marginRight: 4,
                  }}
                >
                  {v.chapter}:{v.verse}
                </span>
                {tokens.map((tok, tIdx) => {
                  const isSpace = /^\s+$/.test(tok);
                  if (isSpace) return <span key={tIdx}>{tok}</span>;
                  const thisWordIdx = wordCounter++;
                  const highlighted =
                    isSpeaking &&
                    activeVerseIdx === idx &&
                    activeWordIdx === thisWordIdx;
                  return (
                    <span
                      key={tIdx}
                      style={{
                        backgroundColor: highlighted ? '#bfdbfe' : undefined,
                        borderRadius: highlighted ? 4 : undefined,
                      }}
                    >
                      {tok}
                    </span>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ---- Back button ----

function BackButton(props: { onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        border: 'none',
        background: 'transparent',
        color: '#4b5563',
        fontSize: 14,
        padding: 0,
        marginBottom: 8,
        cursor: 'pointer',
      }}
    >
      ‹ Home
    </button>
  );
}
