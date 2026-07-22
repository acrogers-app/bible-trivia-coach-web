'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
            color: 'var(--btc-ink)',
          }}
        >
          Well, that didn&apos;t go as planned
        </h1>
        <p style={{ fontSize: 14, color: 'var(--btc-text-subtle)', marginBottom: 20 }}>
          Something hiccuped on our end — it&apos;s not you. Take a breath, and
          let&apos;s pick up right where you left off.
        </p>
        <button type="button" className="btc-hero-cta" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
