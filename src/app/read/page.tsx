'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BottomNav from '../../components/BottomNav';
import { applySettingsToDocument, loadSettings, onSettingsChanged, type AppSettings } from '../../lib/appSettings';

type VerseLine = { chapter: number; verse: number; text: string };

const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah',
  'Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah',
  'Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum',
  'Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians',
  'Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy',
  '2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John',
  '3 John','Jude','Revelation'
];

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function primaryLang(tag: string) { return (tag || '').toLowerCase().split('-')[0] || ''; }

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

function voiceScore(v: SpeechSynthesisVoice, targetLang: string) {
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

  if (n.includes('samantha')) s += 90;
  if (n.includes('alex')) s += 60;
  if (n.includes('victoria')) s += 35;

  if (v.default) s += 30;
  if (isBlockedVoiceName(v.name)) s -= 999;
  return s;
}

function bestVoiceFor(voices: SpeechSynthesisVoice[], lang: string) {
  const p = primaryLang(lang);
  const candidates = voices
    .filter((v) => v.lang && primaryLang(v.lang) === p)
    .filter((v) => !isBlockedVoiceName(v.name));
  const sorted = [...candidates].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
  return sorted[0] || null;
}

function computeWordRange(text: string, charIndex: number) {
  const idx = clamp(charIndex, 0, Math.max(0, text.length - 1));
  const isWord = (c: string) => /[A-Za-z0-9’']/.test(c);

  let start = idx;
  while (start > 0 && isWord(text[start - 1])) start--;

  let end = idx;
  while (end < text.length && isWord(text[end])) end++;

  if (start === end) return null;
  return { start, end };
}

export default function ReadPage() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(3);
  const [startVerse, setStartVerse] = useState(16);
  const [endVerse, setEndVerse] = useState<number | ''>('');
  const [mode, setMode] = useState<'chapter'|'range'|'passage'>('chapter');

  // btc:deeplink-start-end
  const [passageStart, setPassageStart] = useState<string | null>(null);
  const [passageEnd, setPassageEnd] = useState<string | null>(null);
  const pendingAutoplayRef = useRef(false);

  const [lines, setLines] = useState<VerseLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ttsState, setTtsState] = useState<'idle'|'speaking'|'paused'>('idle');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeChar, setActiveChar] = useState<number | null>(null);
  const [boundarySupported, setBoundarySupported] = useState(true);

  const [listenMode, setListenMode] = useState(false);

  const runIdRef = useRef(0);

  useEffect(() => {
    applySettingsToDocument(settings);
    const off = onSettingsChanged(() => {
      const next = loadSettings();
      setSettings(next);
      applySettingsToDocument(next);
    });
    return () => off();
  }, []);

  // btc:deeplink-start-end init
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const start = sp.get('start');
      const end = sp.get('end');
      const autoplay = sp.get('autoplay') === '1';

      if (start && end) {
        setMode('passage');
        setPassageStart(start);
        setPassageEnd(end);

        // Try to set book/chapter for nicer display (best-effort)
        const m = start.match(/^(.+?)\s+(\d+):\d+/);
        if (m) {
          setBook(m[1]);
          setChapter(parseInt(m[2], 10));
        }

        pendingAutoplayRef.current = autoplay;

        // Load immediately (don’t rely on state timing)
        (async () => {
          setError(null);
          setLoading(true);
          stop();
          try {
            const url = `/api/passage?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
            const res = await fetch(url);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || `Failed to load passage (${res.status})`);
            setLines(Array.isArray(data?.lines) ? data.lines : []);
          } catch (e) {
            setLines([]);
            setError(e instanceof Error ? e.message : 'Failed to load passage.');
          } finally {
            setLoading(false);
          }
        })();
      }
    } catch {}
  }, []);
 // eslint-disable-line react-hooks/exhaustive-deps

  const progress = useMemo(() => {
    if (!lines.length || activeIdx == null) return 0;
    return Math.round(((activeIdx + 1) / lines.length) * 100);
  }, [lines.length, activeIdx]);

  const activeLine = useMemo(() => {
    if (activeIdx == null || !lines[activeIdx]) return null;
    return lines[activeIdx];
  }, [lines, activeIdx]);

  async function load() {
    setError(null);
    setLoading(true);
    stop();

    try {
      if (mode === 'passage') {
        if (!passageStart || !passageEnd) {
          throw new Error('Missing passage start/end.');
        }
        const url = `/api/passage?start=${encodeURIComponent(passageStart)}&end=${encodeURIComponent(passageEnd)}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed to load passage (${res.status})`);
        setLines(Array.isArray(data?.lines) ? data.lines : []);
        return;
      }

      if (mode === 'chapter') {
        const url = `/api/chapter?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(String(chapter))}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed to load chapter (${res.status})`);
        setLines(Array.isArray(data?.lines) ? data.lines : []);
        return;
      }

      const sv = startVerse;
      const ev = endVerse === '' ? startVerse : Number(endVerse);
      const start = `${book} ${chapter}:${sv}`;
      const end = `${book} ${chapter}:${ev}`;
      const url = `/api/passage?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to load passage (${res.status})`);
      setLines(Array.isArray(data?.lines) ? data.lines : []);
    } catch (e) {
      setLines([]);
      setError(e instanceof Error ? e.message : 'Failed to load passage.');
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    runIdRef.current++;
    try { window.speechSynthesis?.cancel(); } catch {}
    setTtsState('idle');
    setActiveIdx(null);
    setActiveChar(null);
    setBoundarySupported(true);
    setListenMode(false);
  }

  function pause() {
    try { window.speechSynthesis?.pause(); } catch {}
    setTtsState('paused');
  }

  function resume() {
    try { window.speechSynthesis?.resume(); } catch {}
    setTtsState('speaking');
    setListenMode(true);
  }

  function speakVerse(i: number, runId: number) {
    if (runIdRef.current !== runId) return;

    if (i >= lines.length) {
      setTtsState('idle');
      setActiveIdx(null);
      setActiveChar(null);
      setListenMode(false);
      return;
    }

    const line = lines[i];
    setActiveIdx(i);
    setActiveChar(0);
    setTtsState('speaking');
    setListenMode(true);

    const u = new SpeechSynthesisUtterance(line.text);
    u.lang = settings.readerLang || 'en-US';
    u.rate = settings.readerRate;

    try {
      const voices = window.speechSynthesis?.getVoices?.() ?? [];
      const chosen = settings.readerVoiceURI ? voices.find((v) => v.voiceURI === settings.readerVoiceURI) : null;
      const best = chosen || bestVoiceFor(voices, settings.readerLang || 'en-US');
      if (best) {
        u.voice = best;
        u.lang = best.lang || u.lang;
      }
    } catch {}

    let gotBoundary = false;
    u.onboundary = (e: any) => {
      if (runIdRef.current !== runId) return;
      if (typeof e?.charIndex === 'number') {
        gotBoundary = true;
        setActiveChar(e.charIndex);
      }
    };

    u.onend = () => {
      if (runIdRef.current !== runId) return;
      setActiveChar(null);
      speakVerse(i + 1, runId);
    };

    u.onerror = () => {
      if (runIdRef.current !== runId) return;
      setTtsState('idle');
      setListenMode(false);
    };

    window.setTimeout(() => {
      if (runIdRef.current !== runId) return;
      if (!gotBoundary) setBoundarySupported(false);
    }, 900);

    window.speechSynthesis.speak(u);
  }

  function listen() {
    if (!lines.length) {
      setError('Load a chapter or verse range first.');
      return;
    }
    setError(null);

    if (ttsState === 'paused') {
      resume();
      return;
    }

    stop();
    const runId = runIdRef.current;
    speakVerse(0, runId);
  }

  
  // autoplay after deeplink load
  useEffect(() => {
    if (!lines.length) return;
    if (!pendingAutoplayRef.current) return;
    pendingAutoplayRef.current = false;
    // start listening
    try { listen(); } catch {}
  }, [lines.length]);
  
useEffect(() => {
    if (!settings.readerAutoFollow) return;
    if (activeIdx == null) return;

    const id = window.setTimeout(() => {
      const el = document.getElementById(`btc-v-${activeIdx}`);
      if (!el) return;
      const behavior = settings.reduceMotion ? 'auto' : 'smooth';
      el.scrollIntoView({ block: 'center', behavior });
    }, 50);

    return () => window.clearTimeout(id);
  }, [activeIdx, settings.readerAutoFollow, settings.reduceMotion]);

  const listenFont = clamp(Math.round(settings.readerFontSize * 1.55), 22, 40);

  const overlayText = useMemo(() => {
    if (!activeLine) return '';
    if (activeChar == null || !boundarySupported) return activeLine.text;

    const r = computeWordRange(activeLine.text, activeChar);
    if (!r) return activeLine.text;
    return activeLine.text;
  }, [activeLine, activeChar, boundarySupported]);

  return (
    <div className="btc-root" style={{ paddingBottom: 110 }}>
      <BottomNav />

      {listenMode && activeLine && (
        <div className="btc-listen-overlay" role="dialog" aria-label="Listen mode">
          <div className="btc-listen-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900 }}>
                Listen Mode
                <span style={{ fontWeight: 650, opacity: 0.85 }}> • {book} {activeLine.chapter}:{activeLine.verse}</span>
              </div>
              <button
                type="button"
                onClick={() => setListenMode(false)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'white',
                }}
              >
                Minimize
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: listenFont, lineHeight: 1.45 }}>
              {boundarySupported && activeChar != null ? (() => {
                const r = computeWordRange(activeLine.text, activeChar);
                if (!r) return activeLine.text;
                return (
                  <>
                    {activeLine.text.slice(0, r.start)}
                    <mark style={{ padding: '0 4px', borderRadius: 8, background: 'rgba(34,197,94,0.45)', color: 'white' }}>
                      {activeLine.text.slice(r.start, r.end)}
                    </mark>
                    {activeLine.text.slice(r.end)}
                  </>
                );
              })() : (
                activeLine.text
              )}
            </div>

            {!boundarySupported && (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                Word highlighting isn’t available for this voice/browser. Verse highlighting is active instead.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
              <button type="button" onClick={listen} style={overlayBtn}>
                {ttsState === 'paused' ? 'Resume' : 'Listen'}
              </button>
              <button type="button" onClick={pause} disabled={ttsState !== 'speaking'} style={overlayBtn}>
                Pause
              </button>
              <button type="button" onClick={stop} style={overlayBtn}>
                Stop
              </button>

              <span style={{ flex: '1 1 auto' }} />

              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {progress}% • verse {activeIdx != null ? activeIdx + 1 : 0}/{lines.length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="btc-card">
        <div className="btc-aurora">
          <h1 style={{ margin: 0 }}>Read &amp; Listen</h1>
          <p className="btc-text-muted" style={{ marginTop: 6, marginBottom: 0 }}>
            Choose a chapter or verse range. Tap Listen for follow-along highlighting.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginTop: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelSmall}>Book</span>
            <select value={book} onChange={(e) => setBook(e.target.value)} style={input}>
              {BOOKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelSmall}>Chapter</span>
            <input
              inputMode="numeric"
              value={chapter}
              onChange={(e) => setChapter(clamp(parseInt(e.target.value || '1', 10), 1, 150))}
              style={input}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <button type="button" onClick={() => setMode('chapter')} style={pill(mode === 'chapter')}>
            Whole chapter
          </button>
          <button type="button" onClick={() => setMode('range')} style={pill(mode === 'range')}>
            Verse range
          </button>
          <a href="/settings" style={{ marginLeft: 'auto', textDecoration: 'underline' }}>
            Reader settings
          </a>
        </div>

        {mode === 'range' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={labelSmall}>Start verse</span>
              <input inputMode="numeric" value={startVerse} onChange={(e) => setStartVerse(clamp(parseInt(e.target.value || '1', 10), 1, 176))} style={input} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={labelSmall}>End verse (optional)</span>
              <input inputMode="numeric" value={endVerse} onChange={(e) => setEndVerse(e.target.value === '' ? '' : clamp(parseInt(e.target.value, 10), 1, 176))} style={input} />
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          <button type="button" onClick={load} disabled={loading} style={btn}>
            {loading ? 'Loading…' : 'Load'}
          </button>

          <button type="button" onClick={listen} disabled={!lines.length} style={btnPrimary}>
            {ttsState === 'paused' ? 'Resume' : 'Listen'}
          </button>

          <button type="button" onClick={pause} disabled={ttsState !== 'speaking'} style={btn}>
            Pause
          </button>

          <button type="button" onClick={stop} disabled={ttsState === 'idle'} style={btn}>
            Stop
          </button>

          <span style={{ flex: '1 1 auto' }} />

          <div className="btc-text-muted" style={{ fontSize: 12 }}>
            {lines.length ? `${lines.length} verses` : 'No passage loaded'}
            {ttsState !== 'idle' && activeIdx != null ? ` • ${progress}%` : ''}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 16,
            background: 'rgba(0,0,0,0.03)',
            lineHeight: 1.7,
            fontSize: settings.readerFontSize,
            maxWidth: 820,
          }}
        >
          {!lines.length ? (
            <span style={{ opacity: 0.75 }}>Load a chapter or range to display it here.</span>
          ) : (
            lines.map((l, idx) => {
              const active = idx === activeIdx && ttsState !== 'idle';
              const range = active && boundarySupported && activeChar != null
                ? computeWordRange(l.text, activeChar)
                : null;

              return (
                <p
                  key={`${l.chapter}:${l.verse}:${idx}`}
                  id={`btc-v-${idx}`}
                  style={{
                    margin: '0 0 12px 0',
                    padding: active ? '8px 10px' : '0',
                    borderRadius: 12,
                    background: active ? 'rgba(34,197,94,0.10)' : 'transparent',
                    border: active ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent',
                    cursor: 'default',
                  }}
                >
                  <strong style={{ marginRight: 8 }}>{l.chapter}:{l.verse}</strong>

                  {active && range ? (
                    <>
                      {l.text.slice(0, range.start)}
                      <mark style={{ padding: '0 2px', borderRadius: 6 }}>
                        {l.text.slice(range.start, range.end)}
                      </mark>
                      {l.text.slice(range.end)}
                    </>
                  ) : (
                    l.text
                  )}
                </p>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const input: React.CSSProperties = { padding: 10, borderRadius: 12 };
const btn: React.CSSProperties = { padding: '10px 14px', borderRadius: 12 };
const btnPrimary: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  fontWeight: 800,
  border: '1px solid rgba(0,0,0,0.12)',
  background: 'rgba(37,99,235,0.10)',
};
const labelSmall: React.CSSProperties = { fontSize: 12, opacity: 0.75 };

function pill(active: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 999,
    border: active ? '2px solid #111' : '1px solid rgba(0,0,0,0.18)',
    background: active ? 'rgba(0,0,0,0.03)' : 'white',
  };
}

const overlayBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'white',
  fontWeight: 800,
};
