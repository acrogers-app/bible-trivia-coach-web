'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { applySettingsToDocument, loadSettings, onSettingsChanged } from '../lib/appSettings';

const items = [
  { href: '/play',     label: 'Play',     icon: '⚡' },
  { href: '/read',     label: 'Read',     icon: '📖' },
  { href: '/settings', label: 'Settings', icon: '⚙️'  },
];

export default function BottomNav() {
  const pathname = usePathname() || '';

  useEffect(() => {
    const apply = () => applySettingsToDocument(loadSettings());
    apply();
    const off = onSettingsChanged(apply);
    return () => off();
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: '#ffffff',
        borderTop: '1.5px solid rgba(0,0,0,0.09)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '10px 8px 12px',
                textDecoration: 'none',
                color: active ? '#1d4ed8' : '#1a1a1a',
                borderTop: active ? '3px solid #1d4ed8' : '3px solid transparent',
                background: 'transparent',
                minHeight: 60,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{it.icon}</span>
              <span style={{
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#1d4ed8' : '#1a1a1a',
                letterSpacing: 0,
              }}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
