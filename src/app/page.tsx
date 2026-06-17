import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="btc-root" style={{ backgroundColor: '#f3f4f6' }}>
      <div
        className="btc-card"
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <p
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Early access • Bible study made playful
          </p>
          <h1
            style={{
              fontSize: '28px',
              lineHeight: 1.2,
              fontWeight: 800,
              marginBottom: 8,
              color: '#111827',
            }}
          >
            Bible Trivia Coach (Web)
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#4b5563',
              marginBottom: 16,
            }}
          >
            A gentle Bible companion that mixes daily reading, short quizzes,
            and Bible history questions—so Scripture sticks without the guilt
            or streak pressure.
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 20px',
              fontSize: 13,
              color: '#374151',
            }}
          >
            <li>• 30‑day Gospel reading plan with auto‑generated quizzes</li>
            <li>• Scripture and Bible‑history question packs</li>
            <li>• Read‑along audio with word‑by‑word highlighting</li>
          </ul>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginTop: 8,
            }}
          >
            <Link
              href="/play"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                borderRadius: 999,
                backgroundColor: '#16a34a',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 10px 15px rgba(22,163,74,0.25)',
              }}
            >
              Start a quiz
            </Link>
            <span
              style={{
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              No account needed—jump straight into Scripture.
            </span>
          </div>
        </div>

        <div
          style={{
            maxWidth: 360,
            width: '100%',
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                'radial-gradient(circle at top left, #bfdbfe, #f9fafb 60%, #bbf7d0)',
              boxShadow:
                '0 20px 25px -5px rgba(15,23,42,0.15), 0 10px 10px -5px rgba(15,23,42,0.1)',
            }}
          >
            <img
              src="/bible-hero.svg"
              alt="Illustration of an open Bible with a bookmark"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: '#6b7280',
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            “Let the word of Christ dwell in you richly” (Colossians 3:16)
          </p>
        </div>
      </div>
    </div>
  );
}
