export default function Loading() {
  return (
    <div className="btc-root" style={{ backgroundColor: 'var(--btc-elevated)' }}>
      <div
        className="btc-card"
        style={{
          maxWidth: 480,
          margin: '48px auto 0',
          padding: '36px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--btc-text-mid)' }}>
          Loading your Scripture journey...
        </p>
      </div>
    </div>
  );
}
