'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { applySettingsToDocument, loadSettings, onSettingsChanged } from '../lib/appSettings';

const items = [
  { href: '/play', label: 'Play' },
  { href: '/read', label: 'Read' },
  { href: '/settings', label: 'Settings' },
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
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        paddingTop: 10,
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          gap: 10,
        }}
      >
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          return (
            <Link
              key={it.href}
              href={it.href}
              style={{
                textAlign: 'center',
                padding: '12px 12px',
                borderRadius: 14,
                textDecoration: 'none',
                fontWeight: active ? 800 : 650,
                border: active
                  ? '2px solid rgba(37,99,235,0.65)'
                  : '1px solid rgba(0,0,0,0.12)',
                background: active ? 'rgba(37,99,235,0.08)' : 'white',
                color: 'inherit',
              }}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
