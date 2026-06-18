import fs from 'node:fs';

const path = 'src/app/play/page.tsx';
let text = fs.readFileSync(path, 'utf8');

const startMarker = 'function FixedSummaryScreen(props: {';
const endMarker = '// ---- Root page ----';

const start = text.indexOf(startMarker);
const end = text.indexOf(endMarker, start);
if (start === -1 || end === -1) {
  console.error('Could not find FixedSummaryScreen block.');
  process.exit(1);
}

const before = text.slice(0, start);
const after = text.slice(end);

const newFunc = `function FixedSummaryScreen(props: {
  title: string;
  total: number;
  correct: number;
  onBackHome: () => void;
}) {
  const rawCorrect = typeof props.correct === 'number' ? props.correct : 0;
  const rawTotal = typeof props.total === 'number' ? props.total : 0;

  const total = Math.max(rawCorrect, rawTotal);
  const correct = Math.min(rawCorrect, rawTotal);
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const isPerfect = percent === 100;

  const cardStyle = isPerfect
    ? {
        padding: 20,
        borderRadius: 20,
        background:
          'linear-gradient(135deg, rgba(34,197,94,0.98), rgba(16,185,129,0.98))',
        color: 'white',
        marginBottom: 16,
        boxShadow:
          '0 25px 35px rgba(22,163,74,0.45), 0 10px 10px rgba(22,163,74,0.45)',
        border: '1px solid rgba(22,163,74,0.9)',
      }
    : {
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        marginBottom: 16,
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
            Every question is another seed of Scripture planted—keep going! Nice
            progress! God rewards those who diligently seek Him (Hebrews 11:6).
          </div>
        )}
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
`;

text = before + newFunc + '\n\n' + after;
fs.writeFileSync(path, text);
console.log('Updated FixedSummaryScreen with celebratory perfect-score card.');
