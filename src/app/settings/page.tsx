'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import BottomNav from '../../components/BottomNav';
import {
  type AppSettings,
  applySettingsToDocument,
  defaultSettings,
  loadSettings,
  saveSettings,
} from '../../lib/appSettings';
import {
  disableDailyNudge,
  enableDailyNudge,
  isNativeApp,
} from '../../lib/dailyNudge';
import {
  disableFamilyMode,
  enableFamilyMode,
  isFamilyMode,
  isValidPin,
  onFamilyModeChanged,
} from '../../lib/familyMode';

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
  const [saved, setSaved] = useState<AppSettings>(() => loadSettings());
  const [draft, setDraft] = useState<AppSettings>(() => loadSettings());
  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isNative] = useState<boolean>(() => isNativeApp());
  const familyOn = useSyncExternalStore(onFamilyModeChanged, isFamilyMode, () => false);
  const [familyPin, setFamilyPin] = useState<string>('');
  const [familyStatus, setFamilyStatus] = useState<string>('');

  // Applies immediately (not part of the preview-then-Save draft) so a parent
  // can hand the device back knowing the switch is already in effect.
  function toggleFamilyMode() {
    if (!familyOn) {
      if (!isValidPin(familyPin)) {
        setFamilyStatus('Choose a 4-digit PIN first — you’ll need it to turn Family Mode off.');
        return;
      }
      enableFamilyMode(familyPin);
      setFamilyPin('');
      setFamilyStatus('Family Mode is ON. All analytics are off. Keep the PIN somewhere safe.');
    } else if (disableFamilyMode(familyPin)) {
      setFamilyPin('');
      setFamilyStatus('Family Mode is off.');
    } else {
      setFamilyPin('');
      setFamilyStatus('Wrong PIN. Ask a parent to turn Family Mode off.');
    }
  }

  useEffect(() => {
    applySettingsToDocument(saved);
  }, [saved]);

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

  // Settings are only applied on Save — not during editing

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
    const reminderTurnedOn =
      draft.dailyReminderEnabled && !saved.dailyReminderEnabled;
    const reminderTurnedOff =
      !draft.dailyReminderEnabled && saved.dailyReminderEnabled;

    saveSettings(draft);
    setSaved({ ...draft });
    applySettingsToDocument(draft);
    setStatus('Saved.');

    if (reminderTurnedOn) {
      void enableDailyNudge().then((ok) => {
        if (ok) {
          setStatus('Saved. See you tomorrow at 8:00. 🕯️');
        } else {
          const reverted = { ...draft, dailyReminderEnabled: false };
          saveSettings(reverted);
          setSaved(reverted);
          setDraft(reverted);
          setStatus(
            'Saved, but the reminder needs notification permission — allow notifications in your device settings, then try again.',
          );
        }
      });
    } else if (reminderTurnedOff) {
      void disableDailyNudge();
    }
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

          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>App font</div>
            <select value={draft.appFont} onChange={(e) => update({ appFont: e.target.value as AppSettings['appFont'] })} style={select}>
              <option value="system">System (default)</option>
              <option value="rounded">Rounded (friendly)</option>
              <option value="serif">Serif (classic)</option>
            </select>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>App text size: {draft.appTextScale.toFixed(2)}x</div>
            <input type="range" min="0.9" max="1.3" step="0.05" value={draft.appTextScale}
              onChange={(e) => update({ appTextScale: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>

            <label style={row}>
              <input type="checkbox" checked={draft.reduceMotion} onChange={(e) => update({ reduceMotion: e.target.checked })} />
              <span><strong>Reduce motion</strong></span>
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
            {isNative && (
              <label style={row}>
                <input
                  type="checkbox"
                  checked={draft.dailyReminderEnabled}
                  onChange={(e) =>
                    update({ dailyReminderEnabled: e.target.checked })
                  }
                />
                <span>
                  <strong>Daily reminder</strong>
                  <span className="btc-text-muted" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    One gentle nudge at 8:00 each morning. Never more, never
                    any guilt.
                  </span>
                </span>
              </label>
            )}
          </div>

          <div style={preview}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Preview</div>
            <div className="btc-text-muted">
              Bible Study Coach helps you read, listen, and learn with gentle daily challenges.
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>👨‍👩‍👧 Family Mode</h2>
          <p className="btc-text-muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            For families and classrooms. When on, <strong>all</strong> analytics are
            turned off (overriding the toggle above) and a Family Mode banner shows
            so everyone can see it&apos;s active. A parent PIN is required to turn it
            back off. Applies immediately — no Save needed.
          </p>
          <p className="btc-text-muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            💡 Set a PIN so kids can&apos;t change settings without permission.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={familyOn ? 'Parent PIN to turn off' : 'Set a 4-digit parent PIN'}
              value={familyPin}
              onChange={(e) => setFamilyPin(e.target.value.replace(/\D/g, ''))}
              style={{ ...select, width: 200 }}
              aria-label={familyOn ? 'Parent PIN to turn Family Mode off' : 'Choose a 4-digit parent PIN'}
            />
            <button type="button" onClick={toggleFamilyMode} style={btnPrimary}>
              {familyOn ? 'Turn Family Mode off' : 'Turn Family Mode on'}
            </button>
          </div>
          <div className="btc-text-muted" style={{ fontSize: 12, marginTop: 8 }}>
            {familyStatus || (familyOn ? 'Family Mode is ON.' : 'Family Mode is off.')}{' '}
            <a href="/safety">Read our child safety promise →</a>
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Read &amp; Listen</h2>

          <div style={{ marginTop: 10 }}>
            <div style={labelSmall}>Reader theme</div>
            <select value={draft.readerTheme} onChange={(e) => update({ readerTheme: e.target.value as AppSettings['readerTheme'] })} style={select}>
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
