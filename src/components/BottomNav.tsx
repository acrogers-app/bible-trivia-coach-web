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
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          gap: 0,
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
                padding: '8px 4px',
                borderRadius: 14,
                textDecoration: 'none',
                color: active ? 'rgba(37,99,235,1)' : 'rgba(0,0,0,0.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                borderBottom: active ? '2px solid rgba(37,99,235,0.8)' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: 22 }}>{it.icon}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
