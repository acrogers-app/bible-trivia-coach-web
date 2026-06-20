export type CoachEvent =
  | 'summary_perfect'
  | 'summary_strong'
  | 'summary_steady'
  | 'summary_gentle'
  | 'daily_challenge_nudge';

interface CoachLine {
  id: string;
  text: string;
}

const COACH_LINES: Record<CoachEvent, CoachLine[]> = {
  summary_perfect: [
    {
      id: 'sp1',
      text: 'Strong run—try a longer passage next time.',
    },
    {
      id: 'sp2',
      text: "Beautiful work—God's Word is sticking.",
    },
  ],
  summary_strong: [
    {
      id: 'ss1',
      text: 'Great work. Revisit the few you missed tomorrow.',
    },
    {
      id: 'ss2',
      text: 'You’re remembering a lot—keep building on it.',
    },
  ],
  summary_steady: [
    {
      id: 'st1',
      text: 'Good reps—these questions are where God is teaching you next.',
    },
    {
      id: 'st2',
      text: 'Solid practice. Review the explanations and try again later.',
    },
  ],
  summary_gentle: [
    {
      id: 'sg1',
      text: 'No pressure. This is gentle practice—try again after rereading the passage.',
    },
    {
      id: 'sg2',
      text: 'Missed a bunch? That’s okay. Let this guide you back to the verses.',
    },
  ],
  daily_challenge_nudge: [
    {
      id: 'dc1',
      text: 'Today’s 5-question challenge is ready—just a few minutes in God’s Word.',
    },
    {
      id: 'dc2',
      text: 'Short and gentle: take today’s challenge when you’re ready.',
    },
  ],
};

const DAILY_TIPS: string[] = [
  "Coach's note: Small, consistent quizzes grow strong roots in God’s Word.",
  "Coach's tip: Say the answer out loud—your memory loves hearing Scripture.",
  "Coach's tip: Missed questions are just pointers to what God is teaching next.",
  "Coach's tip: Try quizzing on the same chapter tomorrow and see what you remember.",
  "Coach's tip: Turn this into family night—take turns reading and answering together.",
  "Coach's tip: Pair today’s quiz with a short prayer asking God to plant His Word deeply.",
];

function pickRandomLine(lines: CoachLine[]): string {
  if (!lines.length) return '';
  const idx = Math.floor(Math.random() * lines.length);
  return lines[idx].text;
}

export function getQuizSummaryLine(percent: number): string {
  let event: CoachEvent;
  if (percent === 100) event = 'summary_perfect';
  else if (percent >= 80) event = 'summary_strong';
  else if (percent >= 50) event = 'summary_steady';
  else event = 'summary_gentle';
  return pickRandomLine(COACH_LINES[event]);
}

export function getDailyChallengeNudgeLine(): string {
  return pickRandomLine(COACH_LINES.daily_challenge_nudge);
}

export function getTodayCoachTip(): string {
  try {
    const today = new Date();
    const day = today.getDate(); // 1–31
    return DAILY_TIPS[day % DAILY_TIPS.length];
  } catch {
    return DAILY_TIPS[0];
  }
}
