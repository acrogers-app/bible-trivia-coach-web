'use client';

import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import {
  type AppSettings,
  type ColorTheme,
  applySettingsToDocument,
  defaultSettings,
  loadSettings,
  saveSettings,
} from '../../lib/appSettings';

type VoiceOpt = SpeechSynthesisVoice;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function primaryLang(tag: string) {
  return (tag || '').toLowerCase().split('-')[0] || '';
}

// Always block novelty/sfx voices.
function isBlockedVoiceName(name: string) {
  const n = (name || '').toLowerCase();
  const blocked = [
    'bad news', 'good news',
    'bahh', 'bark', 'woof', 'dog',
    'cellos', 'organ', 'bells',
    'wobble', 'boing',
    'whisper', 'robot',
    'jester', 'superstar',
    'trinoids', 'zarvox',
    'sound', 'effect',
    'grandma', 'grandpa',
  ];
  return blocked.some((x) => n.includes(x));
}

function voiceScore(v: VoiceOpt, targetLang: string) {
  const n = (v.name || '').toLowerCase();
  const target = (targetLang || '').toLowerCase();
  const vlang = (v.lang || '').toLowerCase();

  let s = 0;
  if (vlang === target) s += 20;
  if (primaryLang(v.lang) === primaryLang(targetLang)) s += 10;

  if (n.includes('google')) s += 80;
  if (n.includes('microsoft')) s += 55;
  if (n.includes('enhanced')) s += 25;
  if (n.includes('siri')) s += 20;

  // Apple “good humans”
  if (n.includes('samantha')) s += 90;
  if (n.includes('alex')) s += 60;
  if (n.includes('victoria')) s += 35;

  if (v.default) s += 30;
  if (isBlockedVoiceName(v.name)) s -= 999;

  return s;
}

function bestVoiceFor(voices: VoiceOpt[], lang: string) {
  const p = primaryLang(lang);
  const candidates = voices
    .filter((v) => v.lang && primaryLang(v.lang) === p)
    .filter((v) => !isBlockedVoiceName(v.name));

  const sorted = [...candidates].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
  return sorted[0] || null;
}

function isGoogleAvailable(voices: VoiceOpt[], lang: string) {
  const p = primaryLang(lang);
  return voices.some((v) => primaryLang(v.lang) === p && (v.name || '').toLowerCase().includes('google'));
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<AppSettings>(defaultSettings);
  const [draft, setDraft] = useState<AppSettings>(defaultSettings);
  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const s = loadSettings();
    setSaved(s);
    setDraft(s);
    applySettingsToDocument(s);
  }, []);

  useEffect(() => {
    function load() {
      try {
        const v = window.speechSynthesis?.getVoices?.() ?? [];
        setVoices(v);
      } catch {}
    }
    load();
    try {
      window.speechSynthesis?.addEventListener?.('voiceschanged', load);
    } catch {}
    return () => {
      try {
        window.speechSynthesis?.removeEventListener?.('voiceschanged', load);
      } catch {}
    };
  }, []);

  useEffect(() => {
    applySettingsToDocument(draft);
  }, [draft]);

  useEffect(() => {
    return () => applySettingsToDocument(saved);
  }, [saved]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  const langs = useMemo(() => {
    const set = new Set<string>();
    for (const v of voices) {
      if (!v.lang) continue;
      if (isBlockedVoiceName(v.name)) continue;
      set.add(v.lang);
    }
    const arr = [...set].sort((a, b) => a.localeCompare(b));
    if (arr.includes('en-US')) return ['en-US', ...arr.filter((x) => x !== 'en-US')];
    return arr;
  }, [voices]);

  const best = useMemo(() => bestVoiceFor(voices, draft.readerLang), [voices, draft.readerLang]);
  const googleAvail = useMemo(() => isGoogleAvailable(voices, draft.readerLang), [voices, draft.readerLang]);

  const voiceOptions = useMemo(() => {
    const p = primaryLang(draft.readerLang);
    const candidates = voices
      .filter((v) => v.lang && primaryLang(v.lang) === p)
      .filter((v) => !isBlockedVoiceName(v.name));

    const sorted = [...candidates].sort((a, b) => voiceScore(b, draft.readerLang) - voiceScore(a, draft.readerLang));
    return draft.readerShowAllVoices ? sorted : sorted.slice(0, 8);
  }, [voices, draft.readerLang, draft.readerShowAllVoices]);

  function update(patch: Partial<AppSettings>) {
    setStatus('');
    setDraft((d) => {
      const next = { ...d, ...patch };
      next.appTextScale = clamp(next.appTextScale, 0.9, 1.3);
      next.readerFontSize = clamp(next.readerFontSize, 14, 28);
      next.readerRate = clamp(next.readerRate, 0.7, 1.3);
      next.readerTheme = (next.readerTheme === 'calm' || next.readerTheme === 'vibrant') ? next.readerTheme : 'vibrant';
      return next;
    });
  }

  function save() {
    saveSettings(draft);
    setSaved(draft);
    setStatus('Saved.');
  }
  function cancel() {
    setDraft(saved);
    setStatus('Canceled (restored saved settings).');
  }
  function reset() {
    setDraft(defaultSettings);
    setStatus('Reset (not saved yet).');
  }

  function testVoice() {
    try {
      if (!('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      const sample = 'In the beginning, God created the heavens and the earth.';
      const u = new SpeechSynthesisUtterance(sample);

      u.lang = draft.readerLang || 'en-US';
      u.rate = draft.readerRate;

      const chosen = draft.readerVoiceURI ? voices.find((x) => x.voiceURI === draft.readerVoiceURI) : null;
      const use = chosen || best;
      if (use) {
        u.voice = use;
        u.lang = use.lang || u.lang;
      }

      window.speechSynthesis.speak(u);
    } catch {}
  }

  const autoLabel = best ? `Auto (best: ${best.name} • ${best.lang})` : 'Auto (best available)';

  return (
    <div className="btc-root" style={{ paddingBottom: 110 }}>
      <BottomNav />
      <div className="btc-card">
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <p className="btc-text-muted">Preview changes, then Save.</p>

        <div style={card}>
          <h2 style={h2}>App appearance</h2>

          {/* ── Color theme picker ── */}
          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>Color theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 6 }}>
              {([ 
                { value: 'light',  label: '☀️ Light'  },
                { value: 'dark',   label: '🌙 Dark'   },
                { value: 'system', label: '⚙️ System' },
              ] as { value: 'light'|'dark'|'system'; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ colorTheme: opt.value })}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 12,
                    border: draft.colorTheme === opt.value
                      ? '2.5px solid #1d4ed8'
                      : '1px solid rgba(0,0,0,0.15)',
                    background: draft.colorTheme === opt.value
                      ? 'rgba(29,78,216,0.08)' : 'white',
                    fontWeight: draft.colorTheme === opt.value ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="btc-text-muted" style={{ fontSize: 12, marginTop: 6 }}>
              Dark mode is easier on the eyes at night. System follows your device automatically.
            </div>
          </div>

          {/* ── Font ── */}
          <div style={{ marginTop: 12 }}>
            <div style={labelSmall}>App font</div>
            <select value={draft.appFont} onChange={(e) => update({ appFont: e.target.value as any })} style={select}>
              <option value="system">System (default)</option>
              <option value="rounded">Rounded (friendly)</option>
              <option value="serif">Serif (classic)</option>
            </select>
          </div>

          {/* ── Text size ── */}
          <div style={{ marginTop: 12 }}>
            <div style={labelSmall}>App text size: {draft.appTextScale.toFixed(2)}x</div>
            <input type="range" min="0.9" max="1.3" step="0.05" value={draft.appTextScale}
              onChange={(e) => update({ appTextScale: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* ── Toggles ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <label style={row}>
              <input type="checkbox" checked={draft.highContrast} onChange={(e) => update({ highContrast: e.target.checked })} />
              <span>
                <strong>High contrast</strong>
                <span className="btc-text-muted" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                  Bold borders, max readability
                </span>
              </span>
            </label>
            <label style={row}>
              <input type="checkbox" checked={draft.reduceMotion} onChange={(e) => update({ reduceMotion: e.target.checked })} />
              <span>
                <strong>Reduce motion</strong>
                <span className="btc-text-muted" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                  No animations
                </span>
              </span>
            </label>
            <label style={row}>
              <input
                type="checkbox"
                checked={draft.analyticsEnabled !== false}
                onChange={(e) => update({ analyticsEnabled: e.target.checked })}
              />
              <span>
                <strong>Anonymous analytics</strong>
                <span className="btc-text-muted" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                  Helps improve questions. No personal data collected.
                </span>
              </span>
            </label>
          </div>

          <div style={preview}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Preview</div>
            <div className="btc-text-muted">
              Bible Trivia Coach helps you read, listen, and learn with gentle daily challenges.
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Read &amp; Listen</h2>

          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>Reader theme</div>
            <select value={draft.readerTheme} onChange={(e) => update({ readerTheme: e.target.value as any })} style={select}>
              <option value="vibrant">Vibrant (Aurora)</option>
              <option value="calm">Calm</option>
            </select>
          </div>

          <label style={row}>
            <input type="checkbox" checked={draft.readerAutoFollow} onChange={(e) => update({ readerAutoFollow: e.target.checked })} />
            <span><strong>Auto-follow</strong> (scroll while listening)</span>
          </label>

          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>Reader text size: {draft.readerFontSize}px</div>
            <input type="range" min="14" max="28" step="1" value={draft.readerFontSize}
              onChange={(e) => update({ readerFontSize: parseInt(e.target.value, 10) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>Voice speed: {draft.readerRate.toFixed(2)}x</div>
            <input type="range" min="0.7" max="1.3" step="0.05" value={draft.readerRate}
              onChange={(e) => update({ readerRate: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={labelSmall}>Language</div>
            <select value={draft.readerLang} onChange={(e) => update({ readerLang: e.target.value, readerVoiceURI: '' })} style={select}>
              {langs.length ? langs.map((l) => <option key={l} value={l}>{l}</option>) : (
                <option value={draft.readerLang}>{draft.readerLang}</option>
              )}
            </select>

            <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: 'white', border: '1px solid rgba(0,0,0,0.10)' }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Voice quality</div>
              <div className="btc-text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Voice quality depends on your browser/device.<br />
                For the most natural voice on Apple devices, <strong>Safari</strong> is recommended.<br />
                For Google-quality voices on many devices, <strong>Chrome/Edge/Opera</strong> are recommended.<br /><br />
                Best detected: <strong>{best ? `${best.name} (${best.lang})` : 'Unknown'}</strong><br />
                Google voices available: <strong>{googleAvail ? 'Yes' : 'No'}</strong>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={labelSmall}>Voice</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
                <input type="checkbox" checked={draft.readerShowAllVoices} onChange={(e) => update({ readerShowAllVoices: e.target.checked })} />
                Show more voices
              </label>
            </div>

            <select value={draft.readerVoiceURI} onChange={(e) => update({ readerVoiceURI: e.target.value })} style={select}>
              <option value="">{autoLabel}</option>
              {voiceOptions.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.default ? ' • default' : ''}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={testVoice} style={btn}>Test voice</button>
              {best && (
                <button type="button" onClick={() => update({ readerVoiceURI: best.voiceURI })} style={btn}>
                  Use best voice
                </button>
              )}
              <button type="button" onClick={() => update({ readerVoiceURI: '' })} style={btn}>
                Use Auto
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={save} disabled={!dirty} style={btnPrimary}>Save</button>
          <button type="button" onClick={cancel} disabled={!dirty} style={btn}>Cancel</button>
          <button type="button" onClick={reset} style={btn}>Reset</button>
          <span className="btc-text-muted" style={{ fontSize: 12 }}>
            {dirty ? 'Unsaved changes' : 'All changes saved'} {status ? `• ${status}` : ''}
          </span>
        </div>

        <div className="btc-text-muted" style={{ marginTop: 12 }}>
          Note: word highlighting depends on browser/voice support.
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { marginTop: 12, padding: 14, borderRadius: 16, background: 'rgba(0,0,0,0.03)' };
const h2: React.CSSProperties = { margin: 0, fontSize: 16 };
const row: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 };
const labelSmall: React.CSSProperties = { fontSize: 12, opacity: 0.75, marginBottom: 6 };
const select: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 12 };
const btn: React.CSSProperties = { padding: '10px 14px', borderRadius: 12 };
const btnPrimary: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  fontWeight: 800,
  border: '1px solid rgba(0,0,0,0.12)',
  background: 'rgba(37,99,235,0.10)',
};
const preview: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 14,
  border: '1px solid rgba(0,0,0,0.10)',
  background: 'white',
};
