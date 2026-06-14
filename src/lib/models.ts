// Domain models mirrored from the iOS app (ContentView.swift)

export type QuizLevelId = 'easy' | 'medium' | 'hard' | 'mixed';

export interface QuizLevel {
  id: QuizLevelId;
  title: string;
  coachingLine: string;
}

export const QUIZ_LEVELS: QuizLevel[] = [
  { id: 'easy',   title: 'Easy',   coachingLine: 'Fast and friendly.' },
  { id: 'medium', title: 'Medium', coachingLine: 'A little deeper.' },
  { id: 'hard',   title: 'Hard',   coachingLine: 'Challenge mode.' },
  { id: 'mixed',  title: 'Mixed',  coachingLine: 'A mix of everything.' },
];

export type QuizModeId = 'practice' | 'challenge';

export interface QuizMode {
  id: QuizModeId;
  title: string;
}

export const QUIZ_MODES: QuizMode[] = [
  { id: 'practice',  title: 'Practice' },
  { id: 'challenge', title: 'Challenge' },
];

export interface TriviaQuestion {
  id: string;
  difficulty: QuizLevelId | string;
  category: string;
  playful?: boolean;
  sourceType?: 'scripture' | 'history';
  learnMore?: string;
  sources?: string[];
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  refStart: string;
  refEnd: string;
}

export interface TriviaPack {
  id: string;
  questions: TriviaQuestion[];
}

export interface ReadingDay {
  day: number;
  title: string;
  start: string;
  end: string;
}

export interface ReadingPlan {
  id: string;
  name: string;
  days: ReadingDay[];
}

// Web-side representation of a quiz attempt.
// Later we will extend this with userId and DB ids.
export interface QuizAttempt {
  id: string;
  createdAt: string; // ISO string
  quizLabel: string; // e.g. 'Daily Quiz', 'Quick Quiz'
  sourceType: 'scripture' | 'history';
  questionCount: number;
  correctCount: number;
  durationSeconds: number;
  mode: QuizModeId;
  playerName?: string | null;
}

export function quizPercent(attempt: QuizAttempt): number {
  if (attempt.questionCount === 0) return 0;
  return Math.round((attempt.correctCount / attempt.questionCount) * 100);
}
