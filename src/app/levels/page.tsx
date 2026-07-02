'use client';

import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../../components/BottomNav';

type TriviaQuestion = { id: string; difficulty: string; sourceType?: string; };
type TriviaPack    = { questions: TriviaQuestion[]; };

function countFor(pack: TriviaPack | null, level: 'easy'|'medium'|'hard'|'mixed') {
  if (!pack) return null; // null = still loading
  const base = (pack.questions || []).filter(
    q => (q.sourceType ?? 'scripture').toLowerCase() === 'scripture'
  );
  const filtered = level === 'mixed'
    ? base
    : base.filter(q => (q.difficulty || '').toLowerCase() === level);
  return new Set(filtered.map(q => q.id)).size;
}

const LEVELS = [
  {
    key:    'easy'   as const,
    emoji:  '🌱',
    label:  'Easy',
    desc:   'Fast and friendly. Great for beginners and younger players.',
    color:  'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    count:  10,
  },
  {
    key:    'medium' as const,
    emoji:  '📖',
    label:  'Medium',
    desc:   'A little deeper. Tests your knowledge of context and detail.',
    color:  'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    count:  10,
  },
  {
    key:    'hard'   as const,
    emoji:  '🔥',
    label:  'Hard',
    desc:   'Challenge mode. For serious Bible scholars.',
    color:  'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    count:  10,
  },
  {
    key:    'mixed'  as const,
    emoji:  '⚡',
    label:  'Mixed',
    desc:   'A mix of everything. Keeps you on your toes.',
    color:  'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.25)',
    count:  10,
  },
] as const;

export default function LevelsPage() {
  const [pack, setPack]   = useState<TriviaPack | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/packs/trivia_core_en_v1.json');
        if (!res.ok) throw new Error(`Failed to load pack (${res.status})`);
        const data = (await res.json()) as TriviaPack;
        if (!cancelled) setPack(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    easy:   countFor(pack, 'easy'),
    medium: countFor(pack, 'medium'),
    hard:   countFor(pack, 'hard'),
    mixed:  countFor(pack, 'mixed'),
  }), [pack]);

  return (
    <div className="btc-root" style={{ paddingBottom: 110 }}>
      <BottomNav />
      <div className="btc-card">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <a
            href="/play"
            style={{ fontSize:13, opacity:0.7, textDecoration:'none', color:'inherit' }}
          >
            ‹ Play
          </a>
        </div>

        <h1 style={{ marginTop:0, marginBottom:4 }}>Levels</h1>
        <p className="btc-text-muted" style={{ marginTop:0, marginBottom:16 }}>
          Pick a difficulty and start a 10-question quiz.
        </p>

        {error && (
          <div style={{ color:'#b91c1c', fontWeight:700, marginBottom:12 }}>
            {error}
          </div>
        )}

        {/* Tile grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
          gap: 12,
        }}>
          {LEVELS.map(lv => {
            const n = counts[lv.key];
            const url = `/play?action=quiz&level=${lv.key}&count=${lv.count}&sourceType=scripture`;

            return (
              <a
                key={lv.key}
                href={url}
                style={{
                  display:        'block',
                  padding:        14,
                  borderRadius:   16,
                  border:         `1.5px solid ${lv.border}`,
                  background:     lv.color,
                  textDecoration: 'none',
                  color:          'inherit',
                  minHeight:      110,
                }}
              >
                <div style={{ fontSize:28, marginBottom:6 }}>{lv.emoji}</div>
                <div style={{ fontWeight:900, fontSize:16 }}>{lv.label}</div>
                <div className="btc-text-muted" style={{ fontSize:12, marginTop:4, lineHeight:1.4 }}>
                  {lv.desc}
                </div>
                <div style={{
                  marginTop:    8,
                  fontSize:     11,
                  opacity:      0.75,
                  fontWeight:   600,
                }}>
                  {n === null ? 'Loading…' : `${n.toLocaleString()} available`}
                </div>
              </a>
            );
          })}
        </div>

        {/* Custom count row */}
        <div style={{
          marginTop:    16,
          padding:      14,
          borderRadius: 14,
          background:   'rgba(0,0,0,0.03)',
          border:       '1px solid rgba(0,0,0,0.07)',
        }}>
          <div style={{ fontWeight:800, marginBottom:10 }}>Custom count</div>
          <CustomCountRow pack={pack} />
        </div>

      </div>
    </div>
  );
}

function CustomCountRow({ pack }: { pack: TriviaPack | null }) {
  const [level, setLevel]   = useState<'easy'|'medium'|'hard'|'mixed'>('mixed');
  const [count, setCount]   = useState(20);

  function go() {
    window.location.href =
      `/play?action=quiz&level=${level}&count=${count}&sourceType=scripture`;
  }

  return (
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
      <select
        value={level}
        onChange={e => setLevel(e.target.value as typeof level)}
        style={{ padding:'8px 12px', borderRadius:12, flex:'1 1 100px' }}
      >
        <option value="easy">🌱 Easy</option>
        <option value="medium">📖 Medium</option>
        <option value="hard">🔥 Hard</option>
        <option value="mixed">⚡ Mixed</option>
      </select>

      <input
        type="number"
        inputMode="numeric"
        min={5}
        max={50}
        value={count}
        onChange={e => setCount(Math.max(5, Math.min(50, parseInt(e.target.value||'10',10))))}
        style={{ padding:'8px 12px', borderRadius:12, width:72 }}
      />
      <span className="btc-text-muted" style={{ fontSize:12 }}>questions</span>

      <button
        type="button"
        onClick={go}
        disabled={!pack}
        style={{
          padding:      '8px 16px',
          borderRadius: 12,
          fontWeight:   800,
          background:   'rgba(37,99,235,0.10)',
          border:       '1px solid rgba(37,99,235,0.25)',
        }}
      >
        Start
      </button>
    </div>
  );
}
