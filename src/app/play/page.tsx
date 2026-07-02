'use client';

import Image from 'next/image';
import React, { useEffect, useState, useRef } from 'react';
import {
  getTodayCoachTip,
  getQuizSummaryLine,
  getDailyChallengeNudgeLine,
} from '@/lib/coachVoice';
import BottomNav from '../../components/BottomNav';
import { sendQuizAnalytics, makeSessionId } from '../../lib/analytics';
import { loadSettings } from '../../lib/appSettings';

// btc:voice-helpers
function btcPrimaryLang(tag: string) {
  return (tag || '').toLowerCase().split('-')[0] || '';
}
function btcIsBlockedVoice(name: string) {
  const n = (name || '').toLowerCase();
  return ['bad news','good news','bahh','bark','cellos','organ','wobble',
    'boing','jester','superstar','trinoids','zarvox','grandma','grandpa',
    'sound','effect'].some(x => n.includes(x));
}
function btcVoiceScore(v: SpeechSynthesisVoice, lang: string) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if ((v.lang||'').toLowerCase() === lang.toLowerCase()) s += 20;
  if (btcPrimaryLang(v.lang) === btcPrimaryLang(lang)) s += 10;
  if (n.includes('google')) s += 80;
  if (n.includes('microsoft')) s += 55;
  if (n.includes('enhanced')) s += 25;
  if (n.includes('samantha')) s += 90;
  if (n.includes('alex')) s += 60;
  if (v.default) s += 30;
  if (btcIsBlockedVoice(v.name)) s -= 999;
  return s;
}
function btcBestVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const p = btcPrimaryLang(lang);
  const candidates = voices.filter(v => btcPrimaryLang(v.lang) === p && !btcIsBlockedVoice(v.name));
  return [...candidates].sort((a,b) => btcVoiceScore(b,lang) - btcVoiceScore(a,lang))[0] || null;
}


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

interface AnswerRecord {
  questionId: string;
  chosenIndex: number;
  correctIndex: number;
  isCorrect: boolean;
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

interface FamilyPlayer {
  id: string;
  name: string;
}

type Screen =
  | { name: 'home' }
  | { name: 'reading'; day: ReadingDay }
  | {
      name: 'quiz';
      title: string;
      questions: TriviaQuestion[];
      sourceType: SourceType;
    }
  | { name: 'summary'; title: string; total: number; correct: number }
  | { name: 'family-setup' }
  | { name: 'family-game'; players: FamilyPlayer[]; questions: TriviaQuestion[] };

type Ref = { bookId: number; chapter: number; verse: number };
type VerseLine = { chapter: number; verse: number; text: string };

const QUIZ_COUNT_PER_READING = 10;
const XP_PER_LEVEL = 50;

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

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

  function openMoreAndScroll(anchorId: string) {

    try {

      const d = document.getElementById('btc-more') as HTMLDetailsElement | null;

      if (d) d.open = true;

      const el = document.getElementById(anchorId);

      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch {}

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

// ---- Fixed summary with safe math + review-missed ----

function FixedSummaryScreen(props: {
  title: string;
  total: number;
  correct: number;
  onBackHome: () => void;
  questions?: TriviaQuestion[];
  answers?: AnswerRecord[] | null;
}) {
  const rawCorrect = typeof props.correct === 'number' ? props.correct : 0;
  const rawTotal = typeof props.total === 'number' ? props.total : 0;

  const total = Math.max(rawCorrect, rawTotal);
  const correct = Math.min(rawCorrect, total);
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const isPerfect = percent === 100;

  const hasFiredRef = useRef(false);

  const [playerName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('btc_player_name');
      const trimmed = raw ? raw.trim() : '';
      return trimmed || null;
    } catch {
      return null;
    }
  });

  // Confetti for perfect scores
  useEffect(() => {
    if (!isPerfect || hasFiredRef.current) return;
    hasFiredRef.current = true;

    (async () => {
      const confetti = (await import('canvas-confetti')).default;

      const duration = 1500;
      const end = Date.now() + duration;
      const colors = ['#22c55e', '#facc15', '#38bdf8', '#ec4899', '#a855f7'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    })();
  }, [isPerfect]);

  // Summary stats in localStorage
  const [best, setBest] = useState<{ correct: number; total: number } | null>(
    null,
  );
  const [isNewBest, setIsNewBest] = useState(false);
  const [lifetimeCorrect, setLifetimeCorrect] = useState<number | null>(null);

  const level =
    lifetimeCorrect != null
      ? Math.floor(lifetimeCorrect / XP_PER_LEVEL) + 1
      : null;
  const levelProgress =
    lifetimeCorrect != null ? lifetimeCorrect % XP_PER_LEVEL : null;
  const levelPercent =
    levelProgress != null
      ? Math.round((levelProgress / XP_PER_LEVEL) * 100)
      : 0;

  function makeKeyFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Lifetime correct answers
    try {
      const raw = window.localStorage.getItem('btc_lifetime_correct');
      const prev = raw ? Number(raw) || 0 : 0;
      const next = prev + correct;
      window.localStorage.setItem('btc_lifetime_correct', String(next));
      setLifetimeCorrect(next);
    } catch {
      // ignore storage issues
    }

    // Best score for this quiz title
    try {
      const key = 'btc_best_' + makeKeyFromTitle(props.title);
      const rawBest = window.localStorage.getItem(key);

      let prevBest: { correct: number; total: number } | null = null;
      if (rawBest) {
        try {
          const parsed = JSON.parse(rawBest) as {
            correct?: number;
            total?: number;
          };
          if (
            typeof parsed.correct === 'number' &&
            typeof parsed.total === 'number'
          ) {
            prevBest = { correct: parsed.correct, total: parsed.total };
          }
        } catch {
          // ignore parse issues
        }
      }

      let newBest = false;
      let nextBest = prevBest;

      if (!prevBest) {
        newBest = true;
        nextBest = { correct, total };
      } else {
        const prevPercent =
          prevBest.total === 0
            ? 0
            : Math.round((prevBest.correct / prevBest.total) * 100);

        if (
          percent > prevPercent ||
          (percent === prevPercent && correct > prevBest.correct)
        ) {
          newBest = true;
          nextBest = { correct, total };
        }
      }

      if (nextBest) {
        window.localStorage.setItem(key, JSON.stringify(nextBest));
      }

      setBest(nextBest);
      setIsNewBest(newBest);
    } catch {
      // ignore storage issues
    }
  }, [props.title, correct, total, percent]);

  // Scripture badge milestones
  const milestones = [
    { label: 'Solid start', threshold: 60 },
    { label: 'Strong run', threshold: 80 },
    { label: 'Near perfect', threshold: 95 },
  ] as const;

  const badgesUnlocked = milestones.filter(
    (m) => percent >= m.threshold,
  ).length;

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

  const subtleTextColor = isPerfect
    ? 'rgba(255,255,255,0.9)'
    : '#4b5563';

  const coachLine = getQuizSummaryLine(percent);

  // ---- Missed questions (review-missed) ----
  const missed = React.useMemo(() => {
    if (!props.questions || !props.answers) return [];
    const byId = new Map(props.questions.map((q) => [q.id, q]));
    return props.answers
      .filter((a) => !a.isCorrect)
      .map((a) => {
        const q = byId.get(a.questionId);
        if (!q) return null;
        return { question: q, answer: a };
      })
      .filter(
        (
          item,
        ): item is { question: TriviaQuestion; answer: AnswerRecord } =>
          item !== null,
      );
  }, [props.questions, props.answers]);

  const [showReview, setShowReview] = useState(false);

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
        <div style={cardStyle}>
          {/* Score */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              marginBottom: 2,
            }}
          >
            {correct}/{total}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {percent}% correct
          </div>

          {/* Scripture badges */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            {milestones.map((m, idx) => {
              const unlocked = percent >= m.threshold;
              const bg = unlocked
                ? isPerfect
                  ? 'rgba(250,250,250,0.16)'
                  : '#e0f2fe'
                : isPerfect
                ? 'rgba(15,118,110,0.4)'
                : '#e5e7eb';
              const border = unlocked
                ? 'none'
                : isPerfect
                ? '1px dashed rgba(209,250,229,0.8)'
                : '1px dashed rgba(148,163,184,0.9)';
              const textColor = unlocked
                ? isPerfect
                  ? '#fefce8'
                  : '#0f172a'
                : isPerfect
                ? '#e5e7eb'
                : '#6b7280';

              return (
                <div
                  key={m.label}
                  style={{
                    minWidth: 80,
                    padding: '6px 10px',
                    borderRadius: 999,
                    backgroundColor: bg,
                    border,
                    fontSize: 11,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 2,
                      color: textColor,
                    }}
                  >
                    {unlocked ? '✓' : '•'} Badge {idx + 1}
                  </div>
                  <div style={{ color: textColor }}>{m.label}</div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontSize: 12,
              marginBottom: 8,
              color: subtleTextColor,
            }}
          >
            {badgesUnlocked === 0
              ? 'Answer a few more correctly to start unlocking Scripture badges on this quiz.'
              : `You unlocked ${badgesUnlocked} of ${milestones.length} Scripture badges on this quiz.`}
          </div>

          {/* Encouragement */}
          {isPerfect ? (
            <div style={{ marginTop: 4 }}>
              <div
                className="btc-perfect-heading"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  marginBottom: 4,
                }}
              >
                Perfect score{playerName ? `, ${playerName}` : ''}!
              </div>
              <div style={{ fontSize: 13 }}>
                Keep planting God&apos;s Word deeply in your heart—He rewards those who
                diligently seek Him (Hebrews 11:6).
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: isPerfect ? 'inherit' : '#374151',
              }}
            >
              Every question is another seed of Scripture planted—nice
              progress{playerName ? `, ${playerName}` : ''}! God rewards those who diligently seek Him (Hebrews
              11:6).
            </div>
          )}
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: subtleTextColor,
            }}
          >
            Coach&apos;s note: {coachLine}
          </div>
        </div>
      </div>

      {/* Best + lifetime stats */}
      <div
        style={{
          fontSize: 13,
          color: '#4b5563',
          marginBottom: 8,
        }}
      >
        <div>
          Best on this quiz:{' '}
          {best ? (
            <>
              {best.correct}/{best.total}{' '}
              {isNewBest && (
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: 11,
                    color: '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  New best!
                </span>
              )}
            </>
          ) : (
            '—'
          )}
        </div>
        <div style={{ marginTop: 2 }}>
          Lifetime correct answers:{' '}
          {lifetimeCorrect != null ? lifetimeCorrect : '—'}
        </div>
        {level != null && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                fontSize: 12,
                color: '#4b5563',
              }}
            >
              Level {level}{' '}
              <span style={{ opacity: 0.8 }}>
                · {levelProgress}/{XP_PER_LEVEL} XP to next level
              </span>
            </div>
            <div
              style={{
                marginTop: 4,
                height: 6,
                borderRadius: 999,
                backgroundColor: '#e5e7eb',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${levelPercent}%`,
                  height: '100%',
                  borderRadius: 999,
                  background:
                    'linear-gradient(90deg, #22c55e, #a3e635)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <SummaryExtras quizTitle={props.title} />

      {/* Review missed questions */}
      {missed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowReview((s) => !s)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
              fontSize: 13,
              color: '#111827',
            }}
          >
            {showReview
              ? 'Hide missed questions'
              : `Review missed questions (${missed.length})`}
          </button>
        </div>
      )}

      {showReview && missed.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {missed.map(({ question, answer }, idx) => (
            <div
              key={question.id}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: 12,
                backgroundColor: '#ffffff',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: '#6b7280',
                }}
              >
                Missed question {idx + 1}
              </div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                {question.text}
              </div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>
                Your answer:{' '}
                <span style={{ color: '#b91c1c', fontWeight: 500 }}>
                  {question.options[answer.chosenIndex] ?? '—'}
                </span>
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                Correct answer:{' '}
                <span style={{ color: '#166534', fontWeight: 500 }}>
                  {question.options[answer.correctIndex]}
                </span>
              </div>
              {question.explanation && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#4b5563',
                    marginTop: 4,
                  }}
                >
                  {question.explanation}
                </div>
              )}
              {question.refStart && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#4b5563',
                    marginTop: 4,
                  }}
                >
                  Reference: {question.refStart}
                  {question.refEnd &&
                    question.refEnd !== question.refStart &&
                    ` – ${question.refEnd}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

function markDailyChallengeCompletedForToday(title: string) {
  if (typeof window === 'undefined') return;
  if (title !== 'Daily Quiz') return;
  try {
    const key = getTodayKey();
    window.localStorage.setItem('btc_daily_challenge_last_completed', key);
  } catch {
    // ignore
  }
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
  const [lastQuestions, setLastQuestions] = useState<TriviaQuestion[] | null>(
    null,
  );
  const [lastAnswers, setLastAnswers] = useState<AnswerRecord[] | null>(
    null,
  );

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


  function normalizeRefInput(ref?: string | null) {
    let t = String(ref ?? '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    t = t
      .replace(/^(First|1st)\s+/i, '1 ')
      .replace(/^(Second|2nd)\s+/i, '2 ')
      .replace(/^(Third|3rd)\s+/i, '3 ')
      .replace(/^(III)\s+/i, '3 ')
      .replace(/^(II)\s+/i, '2 ')
      .replace(/^(I)\s+/i, '1 ')
      .replace(/^([123])(?=[A-Za-z])/, '$1 ');

    t = t
      .replace(/^Psalm(\s+\d)/i, 'Psalms$1')
      .replace(/^Ps\.?\s*(\d)/i, 'Psalms $1')
      .replace(/^Revelations\b/i, 'Revelation')
      .replace(/^Song of Songs\b/i, 'Song of Solomon')
      .replace(/^Canticles\b/i, 'Song of Solomon');

    return t;
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
      const s = parseRef(normalizeRefInput(day.start));
      const e = parseRef(normalizeRefInput(day.end));
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
        if (!q.refStart || !q.refEnd) continue;
        const qs = parseRef(q.refStart);
        const qe = parseRef(q.refEnd);
        if (!qs || !qe) continue;
        if (qs.bookId !== startRef.bookId || qe.bookId !== startRef.bookId)
          continue;

        // normalize question range order (just in case)
        let qStart = qs;
        let qEnd = qe;
        if (
          qStart.chapter > qEnd.chapter ||
          (qStart.chapter === qEnd.chapter && qStart.verse > qEnd.verse)
        ) {
          qStart = qe;
          qEnd = qs;
        }

        // overlap check: include questions that intersect the reading range
        if (!isRefInOrBefore(qStart, endRef)) continue;   // question starts after reading ends
        if (!isRefInOrAfter(qEnd, startRef)) continue;    // question ends before reading starts

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

    const verseQuestions = questionsForVerseOfDay(pack, normalizeRefInput(verseOfDay), 3);
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
  function showSummary(
    title: string,
    questions: TriviaQuestion[],
    total: number,
    correct: number,
    answers: AnswerRecord[],
  ) {
    setLastQuestions(questions);
    setLastAnswers(answers);
    markDailyChallengeCompletedForToday(title);

    // btc:analytics
    try {
      sendQuizAnalytics({
        sessionId:  makeSessionId(),
        quizTitle:  title,
        total,
        correct,
        timestamp:  new Date().toISOString(),
        answers: answers.map((a) => {
          const q = questions.find((x) => x.id === a.questionId);
          return {
            questionId:   a.questionId,
            questionText: q?.text ?? '',
            correct:      a.isCorrect,
            selectedText: q?.options?.[a.chosenIndex] ?? String(a.chosenIndex),
            correctText:  q?.options?.[a.correctIndex] ?? String(a.correctIndex),
            difficulty:   q?.difficulty ?? 'unknown',
            refStart:     q?.refStart ?? '',
            refEnd:       q?.refEnd ?? '',
            sourceType:   q?.sourceType ?? 'scripture',
          };
        }),
      });
    } catch {}

    setScreen({ name: 'summary', title, total, correct });
  }

  function startFamilyGame(players: FamilyPlayer[], questionCount: number) {
    if (!pack) {
      window.alert('Questions are still loading.');
      return;
    }
    const questions = randomQuestions(pack, questionCount, null, 'scripture');
    if (!questions.length) {
      window.alert('No questions available yet for Family Night.');
      return;
    }
    setScreen({ name: 'family-game', players, questions });
  }

  return (
    <div className="btc-root" style={{ paddingBottom: 110 }}>
      <BottomNav />
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
            onOpenFamilyNight={() => setScreen({ name: 'family-setup' })}
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
            onFinished={(correct, total, answers) =>
              showSummary(
                screen.title,
                screen.questions,
                total,
                correct,
                answers,
              )
            }
          />
        )}

        {!loading && !error && screen.name === 'summary' && (
          <FixedSummaryScreen
            title={screen.title}
            total={screen.total}
            correct={screen.correct}
            questions={lastQuestions ?? undefined}
            answers={lastAnswers ?? undefined}
            onBackHome={() => setScreen({ name: 'home' })}
          />
        )}

        {!loading && !error && screen.name === 'family-setup' && (
          <FamilySetupScreen
            onBack={() => setScreen({ name: 'home' })}
            onStart={startFamilyGame}
          />
        )}

        {!loading && !error && screen.name === 'family-game' && (
          <FamilyGameScreen
            players={screen.players}
            questions={screen.questions}
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
  onOpenFamilyNight: () => void;
  onStartHistoryQuiz: () => void;
  onStartLevelQuiz: (level: QuizLevel, count: number) => void;
  onStartBookQuiz: (book: string, chapter?: number) => void;
  dailyChallengeCompleted?: boolean;
}) {
  const { today, pack } = props;
  const easyCount = availableCount(pack, 'easy', 'scripture');
  const medCount = availableCount(pack, 'medium', 'scripture');
  const hardCount = availableCount(pack, 'hard', 'scripture');
  const mixedCount = availableCount(pack, 'mixed', 'scripture');
  const coachTip = getTodayCoachTip();
  const dailyNudgeText = getDailyChallengeNudgeLine();

  const [streak] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('btc_streak');
      const num = raw ? Number(raw) || 0 : 0;
      return num > 0 ? num : null;
    } catch {
      return null;
    }
  });

  const [lifetimeCorrect] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('btc_lifetime_correct');
      const num = raw ? Number(raw) || 0 : 0;
      return num > 0 ? num : null;
    } catch {
      return null;
    }
  });

  const level =
    lifetimeCorrect != null
      ? Math.floor(lifetimeCorrect / XP_PER_LEVEL) + 1
      : null;
  const levelProgress =
    lifetimeCorrect != null ? lifetimeCorrect % XP_PER_LEVEL : null;
  const levelPercent =
    levelProgress != null
      ? Math.round((levelProgress / XP_PER_LEVEL) * 100)
      : 0;

  const [dailyChallengeCompletedToday] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const last = window.localStorage.getItem(
        'btc_daily_challenge_last_completed',
      );
      if (!last) return false;
      return last === getTodayKey();
    } catch {
      return false;
    }
  });

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

  const [playerName, setPlayerName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('btc_player_name');
      const trimmed = raw ? raw.trim() : '';
      return trimmed || null;
    } catch {
      return null;
    }
  });

  function handleEditName() {
    if (typeof window === 'undefined') return;
    const current = playerName ?? '';
    const value = window.prompt('What should Coach call you?', current) ?? '';
    const trimmed = value.trim();
    try {
      if (trimmed) {
        window.localStorage.setItem('btc_player_name', trimmed);
        setPlayerName(trimmed);
      } else {
        window.localStorage.removeItem('btc_player_name');
        setPlayerName(null);
      }
    } catch {
      setPlayerName(trimmed || null);
    }
  }

  const maxChapters = bookMaxChapters[selectedBook] ?? 0;

  return (
    <div>
      <section
        style={{
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1>Bible Trivia Coach</h1>
            <p className="btc-text-muted" style={{ marginTop: 4 }}>
              Daily Scripture and Bible history quizzes.
            </p>
            {streak != null && (
              <div
                style={{
                  marginTop: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 999,
                  backgroundColor: '#e0f2fe',
                  fontSize: 12,
                  color: '#1e293b',
                }}
              >
                Streak: {streak} day{streak === 1 ? '' : 's'} in a row
              </div>
            )}
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: '#4b5563',
              }}
            >
              {playerName ? (
                <>
                  Coach is cheering for you,{' '}
                  <span style={{ fontWeight: 600 }}>{playerName}</span>.{' '}
                  <button
                    type="button"
                    onClick={handleEditName}
                    style={{
                      marginLeft: 4,
                      border: 'none',
                      background: 'transparent',
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: 0,
                    }}
                  >
                    Change
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEditName}
                  style={{
                    marginTop: 2,
                    borderRadius: 999,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#111827',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '4px 10px',
                  }}
                >
                  Tap here to add your name
                </button>
              )}
            </div>
            {level != null && (
              <div
                style={{
                  marginTop: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 999,
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #bbf7d0',
                  fontSize: 12,
                  color: '#166534',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 600 }}>Level {level}</span>
                <span style={{ opacity: 0.9 }}>
                  {levelPercent}% toward next level
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              flexShrink: 0,
              maxWidth: 192,
            }}
          >
            <Image
              src="/bsc2.png"
              alt="Bible Trivia Coach"
              width={192}
              height={192}
              priority
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Daily challenge nudge */}
        {!dailyChallengeCompletedToday && (
          <div
            style={{
              marginTop: 12,
              padding: '6px 10px',
              borderRadius: 999,
              backgroundColor: '#dcfce7',
              border: '1px solid #bbf7d0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: '#166534',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>
              {dailyNudgeText ||
                "Today’s 5-question challenge is ready—just a few minutes in God’s Word."}
            </span>
            <button
              type="button"
              onClick={props.onStartDailyQuiz}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                border: 'none',
                backgroundColor: '#16a34a',
                color: 'white',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Start
            </button>
          </div>
        )}
      </section>

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
          <DayPickerRow
            plan={props.plan}
            onOpenReadingForDay={props.onOpenReadingForDay}
          />
        )}

        {/* btc:read-listen-today-rows-v2 */}
        {today && (
          <>
            <Row
              title="Read today"
              subtitle="Open today's passage in Read & Listen"
              onClick={() => {
                window.location.href = `/read?start=${encodeURIComponent(today.start)}&end=${encodeURIComponent(today.end)}`;
              }}
            />
            <Row
              title="Listen now"
              subtitle="Read aloud with follow‑along highlighting"
              onClick={() => {
                window.location.href = `/read?start=${encodeURIComponent(today.start)}&end=${encodeURIComponent(today.end)}&autoplay=1`;
              }}
            />
          </>
        )}

      </Section>

      <div style={{ marginTop:14 }}>

        {/* ── Quick action tile grid ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
            gap: 10,
          }}
        >
          {/* ⚡ Daily Challenge */}
          <button
            type="button"
            onClick={props.onStartDailyQuiz}
            style={{
              textAlign:'left', padding:14, borderRadius:16, cursor:'pointer',
              border: props.dailyChallengeCompleted
                ? '1.5px solid #86efac' : '1px solid rgba(0,0,0,0.10)',
              background: props.dailyChallengeCompleted
                ? 'rgba(34,197,94,0.06)' : 'white',
              minHeight: 90,
            }}
          >
            <div style={{ fontSize:24, marginBottom:4 }}>⚡</div>
            <div style={{ fontWeight:800 }}>
              Daily Challenge
              {props.dailyChallengeCompleted && (
                <span style={{ marginLeft:6 }}>✅</span>
              )}
            </div>
            <div className="btc-text-muted" style={{ marginTop:4, fontSize:12 }}>
              5-question Scripture quiz
            </div>
          </button>

          <button
            type="button"
            onClick={props.onStartQuickQuiz}
            style={{ textAlign:'left', padding:14, borderRadius:16, cursor:'pointer',
              border:'1px solid rgba(0,0,0,0.10)', background:'white', minHeight:90,  }}
          >
            <div style={{ fontSize:24, marginBottom:4 }}>📖</div>
            <div style={{ fontWeight:800 }}>Quick Quiz</div>
            <div className="btc-text-muted" style={{ marginTop:4, fontSize:12 }}>10 mixed questions</div>
          </button>

          <button
            type="button"
            onClick={props.onOpenFamilyNight}
            style={{ textAlign:'left', padding:14, borderRadius:16, cursor:'pointer',
              border:'1px solid rgba(0,0,0,0.10)', background:'white', minHeight:90,  }}
          >
            <div style={{ fontSize:24, marginBottom:4 }}>👨‍👩‍👧</div>
            <div style={{ fontWeight:800 }}>Family Night</div>
            <div className="btc-text-muted" style={{ marginTop:4, fontSize:12 }}>Take turns, shared score</div>
          </button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('btc-by-book-anchor');
              if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
            }}
            style={{ textAlign:'left', padding:14, borderRadius:16, cursor:'pointer',
              border:'1px solid rgba(0,0,0,0.10)', background:'white', minHeight:90 }}
          >
            <div style={{ fontSize:24, marginBottom:4 }}>📚</div>
            <div style={{ fontWeight:800 }}>By Book</div>
            <div className="btc-text-muted" style={{ marginTop:4, fontSize:12 }}>Pick a book to quiz on</div>
          </button>

          <button
            type="button"
            onClick={props.onStartHistoryQuiz}
            style={{ textAlign:'left', padding:14, borderRadius:16, cursor:'pointer',
              border:'1px solid rgba(0,0,0,0.10)', background:'white', minHeight:90,  }}
          >
            <div style={{ fontSize:24, marginBottom:4 }}>📜</div>
            <div style={{ fontWeight:800 }}>Bible History</div>
            <div className="btc-text-muted" style={{ marginTop:4, fontSize:12 }}>History-mode questions</div>
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = '/levels'; }}
            style={{ textAlign:'left', padding:14, borderRadius:16, cursor:'pointer',
              border:'1px solid rgba(0,0,0,0.10)', background:'white', minHeight:90,  }}
          >
            <div style={{ fontSize:24, marginBottom:4 }}>🎯</div>
            <div style={{ fontWeight:800 }}>Levels</div>
            <div className="btc-text-muted" style={{ marginTop:4, fontSize:12 }}>Easy / Medium / Hard / Mixed</div>
          </button>
        </div>

        {/* ── By Book (scrolls here when tile tapped) ───────────── */}
        <div id="btc-by-book-anchor" style={{ marginTop:16 }} />
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

        {/* ── Coach's tip (collapsible) ──────────────────────────── */}
        <details style={{ marginTop:14, borderRadius:14, overflow:'hidden',
          border:'1px solid rgba(0,0,0,0.07)', background:'rgba(254,249,195,0.6)' }}
        >
          <summary style={{ cursor:'pointer', padding:'10px 14px',
            fontWeight:700, listStyle:'none', display:'flex',
            alignItems:'center', gap:8 }}
          >
            <span>💡</span>
            <span>Coach&apos;s tip</span>
          </summary>
          <div style={{ padding:'8px 14px 12px', fontSize:13, color:'#4b5563' }}>
            {coachTip}
          </div>
        </details>

      </div>

    </div>
  );
}


// ---- Day Picker Row ----
function DayPickerRow(props: {
  plan: { days: { day: number; title: string; start: string; end: string }[] };
  onOpenReadingForDay: (day: { day: number; title: string; start: string; end: string }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const filtered = query.trim()
    ? props.plan.days.filter(d => d.title.toLowerCase().includes(query.toLowerCase()))
    : props.plan.days;

  return (
    <>
      <Row
        title="Choose another day in this plan"
        subtitle="Open any reading from the full Bible plan"
        onClick={() => setOpen(o => !o)}
      />
      {open && (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <input
            type="text"
            inputMode="search"
            placeholder="Search by book name (e.g. John, Psalms)…"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.15)', marginBottom: 6,
              boxSizing: 'border-box', fontSize: 14,
            }}
          />
          <div style={{
            maxHeight: 220, overflowY: 'auto', borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.10)', background: 'white',
          }}>
            {filtered.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => { setOpen(false); setQuery(''); props.onOpenReadingForDay(d); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 600 }}>Day {d.day}</span>
                <span style={{ opacity: 0.6, fontSize: 13 }}>{d.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
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
      {
        const _btcS = loadSettings();
        utter.lang = _btcS.readerLang || 'en-US';
        utter.rate = _btcS.readerRate || 1.0;
        try {
          const _btcVoices = window.speechSynthesis?.getVoices?.() ?? [];
          const _btcChosen = _btcS.readerVoiceURI
            ? _btcVoices.find(v => v.voiceURI === _btcS.readerVoiceURI) || null
            : null;
          const _btcVoice = _btcChosen || btcBestVoice(_btcVoices, _btcS.readerLang || 'en-US');
          if (_btcVoice) { utter.voice = _btcVoice; utter.lang = _btcVoice.lang || utter.lang; }
        } catch {}
      }
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
  onFinished: (correct: number, total: number, answers: AnswerRecord[]) => void;
}) {
  const { title, questions } = props;
  const verseMatch = title.match(/^Verse of the day:\s*(.+)$/);
  const verseRefStr = verseMatch ? verseMatch[1] : null;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

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

    setAnswers((prev) => {
      const next = [...prev];
      next[index] = {
        questionId: q.id,
        chosenIndex: optionIndex,
        correctIndex: q.correctIndex,
        isCorrect,
      };
      return next;
    });

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
      props.onFinished(correctCount, questions.length, answers);
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

// ---- Family Night: Setup ----

function FamilySetupScreen(props: {
  onBack: () => void;
  onStart: (players: FamilyPlayer[], questionCount: number) => void;
}) {
  const [names, setNames] = useState<string[]>(['', '']);
  const [questionCount, setQuestionCount] = useState<string>('10');

  function updateName(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addPlayer() {
    setNames((prev) => (prev.length >= 6 ? prev : [...prev, '']));
  }

  function removePlayer(index: number) {
    setNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleStart() {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length < 2) {
      window.alert('Please enter at least 2 names for Family Night.');
      return;
    }
    if (trimmed.length > 6) {
      window.alert('Family Night supports up to 6 players.');
      return;
    }
    const num = Number(questionCount);
    const safe =
      Number.isFinite(num) && num >= 5 && num <= 30 ? Math.floor(num) : 10;
    const players: FamilyPlayer[] = trimmed.map((name, idx) => ({
      id: String(idx + 1),
      name,
    }));
    props.onStart(players, safe);
  }

  return (
    <div>
      <BackButton onClick={props.onBack} />
      <h2>Family Night setup</h2>
      <p className="btc-text-muted" style={{ marginBottom: 12, fontSize: 14 }}>
        Enter names and choose how many questions to play together.
      </p>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
            color: '#111827',
          }}
        >
          Players (2–6)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {names.map((name, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <input
                type="text"
                value={name}
                placeholder={`Player ${idx + 1}`}
                onChange={(e) => updateName(idx, e.target.value)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  padding: '6px 10px',
                  fontSize: 14,
                }}
              />
              {names.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePlayer(idx)}
                  style={{
                    borderRadius: 999,
                    border: 'none',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {names.length < 6 && (
            <button
              type="button"
              onClick={addPlayer}
              style={{
                marginTop: 4,
                borderRadius: 999,
                border: '1px dashed #9ca3af',
                backgroundColor: '#ffffff',
                color: '#111827',
                padding: '6px 10px',
                fontSize: 13,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              + Add player
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
            color: '#111827',
          }}
        >
          Number of questions
        </div>
        <input
          type="number"
          min={5}
          max={30}
          value={questionCount}
          onChange={(e) => setQuestionCount(e.target.value)}
          style={{
            width: 120,
            borderRadius: 999,
            border: '1px solid #e5e7eb',
            padding: '6px 10px',
            fontSize: 14,
          }}
        />
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: '#6b7280',
          }}
        >
          Recommended: 10–20 questions for a fun family game.
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        style={{
          padding: '10px 16px',
          borderRadius: 999,
          border: 'none',
          backgroundColor: '#2563eb',
          color: 'white',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Start Family Night
      </button>
    </div>
  );
}

// ---- Family Night: Game ----

function FamilyGameScreen(props: {
  players: FamilyPlayer[];
  questions: TriviaQuestion[];
  onBackHome: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [scores, setScores] = useState<number[]>(
    () => props.players.map(() => 0),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);

  const totalQuestions = props.questions.length;
  const q = props.questions[currentIndex];
  const isLast = currentIndex === totalQuestions - 1;
  const currentPlayer = props.players[currentPlayerIndex];

  function handleSelect(optionIndex: number) {
    if (selected !== null || finished) return;
    setSelected(optionIndex);
    setShowFeedback(true);
    const isCorrect = optionIndex === q.correctIndex;
    if (isCorrect) {
      setScores((prev) => {
        const next = [...prev];
        next[currentPlayerIndex] += 1;
        return next;
      });
    }
  }

  function handleNext() {
    if (finished) return;
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setShowFeedback(false);
    setCurrentPlayerIndex((i) => (i + 1) % props.players.length);
  }

  const combined = props.players.map((p, idx) => ({
    ...p,
    score: scores[idx],
  }));
  const sorted = [...combined].sort((a, b) => b.score - a.score);
  const topScore = sorted.length ? sorted[0].score : 0;

  if (!q) {
    return (
      <div>
        <BackButton onClick={props.onBackHome} />
        <h2>Family Night</h2>
        <p>Unable to load questions.</p>
      </div>
    );
  }

  return (
    <div style={{ color: '#111827' }}>
      <BackButton onClick={props.onBackHome} />
      <h2>Family Night</h2>
      {!finished && (
        <p
          style={{
            color: '#4b5563',
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          Question {currentIndex + 1} of {totalQuestions} ·{' '}
          <span style={{ fontWeight: 600 }}>{currentPlayer.name}&apos;s</span>{' '}
          turn
        </p>
      )}

      {!finished && (
        <>
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
                    cursor:
                      selected === null && !finished ? 'pointer' : 'default',
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
                  color:
                    selected === q.correctIndex ? '#15803d' : '#b91c1c',
                }}
              >
                {selected === q.correctIndex ? 'Correct!' : 'Not quite'}
              </div>
              <div style={{ fontSize: 14, color: '#111827' }}>
                {q.explanation}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              textAlign: 'right',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#4b5563',
              }}
            >
              Scores:{' '}
              {combined.map((p, idx) => (
                <span key={p.id} style={{ marginRight: 8 }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>:{' '}
                  {scores[idx]}
                </span>
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={selected === null}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: 'none',
                backgroundColor:
                  selected === null ? '#9ca3af' : '#2563eb',
                color: 'white',
                cursor: selected === null ? 'default' : 'pointer',
              }}
            >
              {isLast ? 'Finish game' : 'Next question'}
            </button>
          </div>
        </>
      )}

      {finished && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Final scores
          </h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: 14,
            }}
          >
            {sorted.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                }}
              >
                <span
                  style={{
                    fontWeight: p.score === topScore ? 700 : 500,
                    color: p.score === topScore ? '#166534' : '#111827',
                  }}
                >
                  {p.name}
                  {p.score === topScore ? ' (winner)' : ''}
                </span>
                <span>{p.score}</span>
              </li>
            ))}
          </ul>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: '#4b5563',
            }}
          >
            Great game! Everyone planted more of God&apos;s Word tonight.
          </p>

          <button
            type="button"
            onClick={props.onBackHome}
            style={{
              marginTop: 12,
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: '#111827',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Back to Home
          </button>
        </div>
      )}
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
      {
        const _btcS = loadSettings();
        utter.lang = _btcS.readerLang || 'en-US';
        utter.rate = _btcS.readerRate || 1.0;
        try {
          const _btcVoices = window.speechSynthesis?.getVoices?.() ?? [];
          const _btcChosen = _btcS.readerVoiceURI
            ? _btcVoices.find(v => v.voiceURI === _btcS.readerVoiceURI) || null
            : null;
          const _btcVoice = _btcChosen || btcBestVoice(_btcVoices, _btcS.readerLang || 'en-US');
          if (_btcVoice) { utter.voice = _btcVoice; utter.lang = _btcVoice.lang || utter.lang; }
        } catch {}
      }
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
