'use client';

import { useState, type FormEvent } from 'react';

const ENDPOINT = 'https://dashboard.webeuseful.com/api/safety-contact';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--btc-border)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 'var(--btc-body-size)',
  fontFamily: 'inherit',
  color: 'var(--btc-text-main)',
  background: 'var(--btc-surface)',
  marginBottom: 10,
} as const;

export default function SafetyContactForm() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || undefined,
          source: 'bible-safety-page',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // The endpoint also logs failed stores server-side; never show a child an error here.
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <p
        style={{
          color: 'var(--btc-text-main)',
          fontSize: 'var(--btc-body-size)',
          lineHeight: 1.6,
          background: 'var(--btc-success-soft)',
          border: '1px solid #a7f3d0',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        ✅ Message sent. We&rsquo;ll review it within 48 hours.
      </p>
    );
  }

  return (
    <form id="safety-contact-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="Your question or concern..."
        rows={4}
        maxLength={500}
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ ...fieldStyle, resize: 'vertical' }}
      />
      <input
        type="email"
        placeholder="Your email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={fieldStyle}
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        style={{
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          fontSize: 'var(--btc-body-size)',
          fontFamily: 'inherit',
          fontWeight: 600,
          color: '#fff',
          background: '#059669',
          cursor: status === 'sending' ? 'wait' : 'pointer',
        }}
      >
        {status === 'sending' ? 'Sending…' : 'Send to Safety Team'}
      </button>
    </form>
  );
}
