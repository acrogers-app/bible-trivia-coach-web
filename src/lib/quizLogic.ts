import type {
  TriviaPack,
  TriviaQuestion,
  QuizLevelId,
  ReadingPlan,
  ReadingDay,
} from './models';

// Simple Fisher–Yates shuffle that returns a new array
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomQuestions(params: {
  pack: TriviaPack;
  count: number;
  difficulty?: QuizLevelId | null;
  sourceType: 'scripture' | 'history';
}): TriviaQuestion[] {
  const { pack, count, difficulty, sourceType } = params;

  if (!pack.questions.length || count <= 0) return [];

  const wantSource = sourceType.toLowerCase();

  const sourceFiltered = pack.questions.filter((q) => {
    const src = (q.sourceType ?? 'scripture').toLowerCase();
    return src === wantSource;
  });

  const diffFiltered: TriviaQuestion[] =
    difficulty && difficulty !== 'mixed'
      ? sourceFiltered.filter(
          (q) => q.difficulty.toLowerCase() === difficulty.toLowerCase(),
        )
      : sourceFiltered;

  // De‑dupe by id
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

  // Playful sprinkling: same idea as the Swift version
  const targetPlayful =
    maxCount >= 10 ? 2 : maxCount >= 5 ? 1 : 0;

  const shuffled = shuffle(unique);
  const playfulQs = shuffled.filter((q) => q.playful === true);
  const seriousQs = shuffled.filter((q) => !q.playful);

  const chosen: TriviaQuestion[] = [];

  // First, fill with serious questions so playful ones are a small spice
  chosen.push(
    ...seriousQs.slice(0, Math.max(0, maxCount - targetPlayful)),
  );

  const remaining = maxCount - chosen.length;
  if (remaining > 0) {
    chosen.push(
      ...playfulQs.slice(0, Math.min(targetPlayful, remaining)),
    );
  }

  // If we still don't have enough (e.g., not enough playful/serious),
  // top up from the remaining pool without repeats.
  if (chosen.length < maxCount) {
    const used = new Set(chosen.map((q) => q.id));
    const remainder = shuffled.filter((q) => !used.has(q.id));
    chosen.push(...remainder.slice(0, maxCount - chosen.length));
  }

  return shuffle(chosen);
}

export function availableCount(params: {
  pack: TriviaPack;
  level: QuizLevelId;
  sourceType: 'scripture' | 'history';
}): number {
  const { pack, level, sourceType } = params;
  const wantSource = sourceType.toLowerCase();

  const base = pack.questions.filter((q) => {
    const src = (q.sourceType ?? 'scripture').toLowerCase();
    return src === wantSource;
  });

  const filtered =
    level === 'mixed'
      ? base
      : base.filter(
          (q) => q.difficulty.toLowerCase() === level.toLowerCase(),
        );

  const ids = new Set(filtered.map((q) => q.id));
  return ids.size;
}

// Equivalent of Swift's todaysReadingDay()
export function todaysReadingDay(
  plan: ReadingPlan,
  now: Date = new Date(),
): ReadingDay | null {
  if (!plan.days || plan.days.length === 0) return null;

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diffMs = now.getTime() - startOfYear.getTime();
  const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // 1‑based

  const idx = (dayIndex - 1) % plan.days.length;
  return plan.days[idx];
}
