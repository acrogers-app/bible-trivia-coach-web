import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="btc-root" style={{ backgroundColor: '#f3f4f6' }}>
      <div
        className="btc-card"
        style={{
          maxWidth: 480,
          margin: '48px auto 0',
          padding: '36px 24px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 8,
            color: '#111827',
          }}
        >
          Hmm, this page seems to have wandered off
        </h1>
        <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 20 }}>
          No worries — even the best of us take a wrong turn now and then.
          Let&apos;s head back to your journey.
        </p>
        <Link href="/play" className="btc-hero-cta">
          Back to Play
        </Link>
      </div>
    </div>
  );
}
