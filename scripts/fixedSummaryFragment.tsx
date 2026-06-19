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

  const hasFiredRef = useRef(false);

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
            <div style={{ fontSize: 13 }}>
              Perfect score! Keep planting God&apos;s Word deeply in your
              heart—He rewards those who diligently seek Him (Hebrews 11:6).
            </div>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: isPerfect ? 'inherit' : '#374151',
              }}
            >
              Every question is another seed of Scripture planted—nice
              progress! God rewards those who diligently seek Him (Hebrews
              11:6).
            </div>
          )}
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
