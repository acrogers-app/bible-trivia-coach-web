import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="btc-root" style={{ backgroundColor: '#f3f4f6' }}>
      <div
        className="btc-card"
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '36px 24px 30px',
        }}
      >
        {/* HERO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
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
              Make Scripture stick with gentle daily quizzes
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#4b5563',
                marginBottom: 16,
              }}
            >
              Bible Trivia Coach guides you through short Gospel readings and
              low‑pressure quizzes, so you remember more of what you read
              without streaks or guilt.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 18px',
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
                marginTop: 6,
              }}
            >
              <Link href="/play" className="btc-hero-cta">
                Start today&apos;s quiz
              </Link>
              <span
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                Takes about 5–10 minutes. No account needed.
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

        {/* HOW IT WORKS */}
        <section
          style={{
            marginTop: 32,
            paddingTop: 18,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            How it works
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                backgroundColor: '#eff6ff',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1d4ed8',
                  marginBottom: 4,
                }}
              >
                1. Read a short passage
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                Follow a 30‑day Gospel plan or pick any book and chapter. Most
                readings take 3–5 minutes.
              </p>
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                backgroundColor: '#ecfdf5',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#15803d',
                  marginBottom: 4,
                }}
              >
                2. Take a gentle quiz
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                Answer 5–10 questions drawn directly from the passage to make
                key details and themes stick.
              </p>
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                backgroundColor: '#fef3c7',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#b45309',
                  marginBottom: 4,
                }}
              >
                3. Reflect &amp; revisit
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                See summaries, reflections, and history nuggets that connect
                what you read to everyday life.
              </p>
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section
          style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 6,
            }}
          >
            Built for real‑life Bible readers
          </h2>
          <p
            style={{
              fontSize: 13,
              color: '#4b5563',
              marginBottom: 10,
            }}
          >
            Bible Trivia Coach works well if you&apos;re:
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: 13,
              color: '#374151',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 6,
            }}
          >
            <li>• Restarting regular Bible reading</li>
            <li>• Leading a small group or family time</li>
            <li>• Wanting Scripture to stick, not just be skimmed</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
