'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { applySettingsToDocument, loadSettings, onSettingsChanged } from '../lib/appSettings';

function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 6c-1.5-1.6-3.8-2.5-6.5-2.5-.9 0-1.7.1-2.5.3v14.9c.8-.2 1.6-.3 2.5-.3 2.7 0 5 .9 6.5 2.5 1.5-1.6 3.8-2.5 6.5-2.5.9 0 1.7.1 2.5.3V3.8c-.8-.2-1.6-.3-2.5-.3-2.7 0-5 .9-6.5 2.5Zm0 0v14.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.8v2.4m0 13.6v2.4m6.5-15.9-1.7 1.7M7.2 16.8l-1.7 1.7m15.7-6.5h-2.4M5.2 12H2.8m15.9 6.5-1.7-1.7M7.2 7.2 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const items = [
  { href: '/play',     label: 'Play',     icon: <BoltIcon /> },
  { href: '/read',     label: 'Read',     icon: <BookIcon /> },
  { href: '/settings', label: 'Settings', icon: <GearIcon /> },
];

export default function BottomNav() {
  const pathname = usePathname() || '';

  useEffect(() => {
    const apply = () => applySettingsToDocument(loadSettings());
    apply();
    // Also respond to system dark mode changes
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', apply);
    const off = onSettingsChanged(apply);
    return () => { off(); mq?.removeEventListener?.('change', apply); };
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 1000,
        background: 'var(--btc-nav-bg, #ffffff)',
        borderTop: '1.5px solid var(--btc-nav-border, rgba(0,0,0,0.09))',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{
        maxWidth: 520, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      }}>
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: '10px 8px 12px',
                textDecoration: 'none',
                color: active
                  ? 'var(--btc-nav-active, #1d4ed8)'
                  : 'var(--btc-nav-inactive, #1a1a1a)',
                borderTop: active
                  ? '3px solid var(--btc-nav-active, #1d4ed8)'
                  : '3px solid transparent',
                minHeight: 60,
              }}
            >
              <span style={{ lineHeight: 1, display: 'inline-flex' }}>{it.icon}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
