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
function primaryLang(tag: string) { return (tag||'').toLowerCase().split('-')[0]||''; }

function isBlockedVoiceName(name: string) {
  const n = (name||'').toLowerCase();
  return ['bad news','good news','bahh','bark','cellos','organ','wobble','boing',
    'jester','superstar','trinoids','zarvox','grandma','grandpa','sound','effect']
    .some(x => n.includes(x));
}

function voiceScore(v: SpeechSynthesisVoice, lang: string) {
  const n = (v.name||'').toLowerCase();
  let s = 0;
  if ((v.lang||'').toLowerCase() === lang.toLowerCase()) s += 20;
  if (primaryLang(v.lang) === primaryLang(lang)) s += 10;
  if (n.includes('google')) s += 80;
  if (n.includes('microsoft')) s += 55;
  if (n.includes('enhanced')) s += 25;
  if (n.includes('samantha')) s += 90;
  if (n.includes('alex')) s += 60;
  if (v.default) s += 30;
  if (isBlockedVoiceName(v.name)) s -= 999;
  return s;
}

function bestVoiceFor(voices: SpeechSynthesisVoice[], lang: string) {
  const p = primaryLang(lang);
  const candidates = voices.filter(v => v.lang && primaryLang(v.lang) === p && !isBlockedVoiceName(v.name));
  return [...candidates].sort((a,b) => voiceScore(b,lang) - voiceScore(a,lang))[0] || null;
}

function computeWordRange(text: string, charIndex: number) {
  const idx = clamp(charIndex, 0, Math.max(0, text.length-1));
  const isWord = (c: string) => /[A-Za-z0-9'']/.test(c);
  let start = idx;
  while (start > 0 && isWord(text[start-1])) start--;
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
  const [endVerse, setEndVerse] = useState<number|''>('');
  const [mode, setMode] = useState<'chapter'|'range'>('chapter');
  const [lines, setLines] = useState<VerseLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [ttsState, setTtsState] = useState<'idle'|'speaking'|'paused'>('idle');
  const [activeIdx, setActiveIdx] = useState<number|null>(null);
  const [activeChar, setActiveChar] = useState<number|null>(null);
  const [boundarySupported, setBoundarySupported] = useState(true);
  const runIdRef = useRef(0);
  const pendingAutoplayRef = useRef(false);

  useEffect(() => {
    applySettingsToDocument(settings);
    const off = onSettingsChanged(() => {
      const next = loadSettings();
      setSettings(next);
      applySettingsToDocument(next);
    });
    return () => off();
  }, []); // eslint-disable-line

  // Deep link: ?start=...&end=...&autoplay=1
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const start = sp.get('start');
      const end = sp.get('end');
      const autoplay = sp.get('autoplay') === '1';
      if (!start || !end) return;
      pendingAutoplayRef.current = autoplay;
      (async () => {
        const m = start.match(/^(.+?)\s+(\d+):\d+/);
        if (m) { setBook(m[1]); setChapter(parseInt(m[2],10)); }
        setError(null); setLoading(true); stop();
        try {
          const res = await fetch(`/api/passage?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
          setLines(Array.isArray(data?.lines) ? data.lines : []);
        } catch(e) { setLines([]); setError(e instanceof Error ? e.message : 'Failed.'); }
        finally { setLoading(false); }
      })();
    } catch {}
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!lines.length || !pendingAutoplayRef.current) return;
    pendingAutoplayRef.current = false;
    try { listen(); } catch {}
  }, [lines.length]); // eslint-disable-line

  const progress = useMemo(() => {
    if (!lines.length || activeIdx == null) return 0;
    return Math.round(((activeIdx+1)/lines.length)*100);
  }, [lines.length, activeIdx]);

  async function load() {
    setError(null); setLoading(true); stop();
    try {
      if (mode === 'chapter') {
        const res = await fetch(`/api/chapter?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(String(chapter))}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
        setLines(Array.isArray(data?.lines) ? data.lines : []);
        return;
      }
      const sv = startVerse;
      const ev = endVerse === '' ? startVerse : Number(endVerse);
      const res = await fetch(`/api/passage?start=${encodeURIComponent(`${book} ${chapter}:${sv}`)}&end=${encodeURIComponent(`${book} ${chapter}:${ev}`)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setLines(Array.isArray(data?.lines) ? data.lines : []);
    } catch(e) { setLines([]); setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setLoading(false); }
  }

  function stop() {
    runIdRef.current++;
    try { window.speechSynthesis?.cancel(); } catch {}
    setTtsState('idle'); setActiveIdx(null); setActiveChar(null); setBoundarySupported(true);
  }

  function pause() {
    try { window.speechSynthesis?.pause(); } catch {}
    setTtsState('paused');
  }

  function resume() {
    try { window.speechSynthesis?.resume(); } catch {}
    setTtsState('speaking');
  }

  function speakVerse(i: number, runId: number) {
    if (runIdRef.current !== runId) return;
    if (i >= lines.length) { setTtsState('idle'); setActiveIdx(null); setActiveChar(null); return; }
    const line = lines[i];
    setActiveIdx(i); setActiveChar(0); setTtsState('speaking');
    const u = new SpeechSynthesisUtterance(line.text);
    u.lang = settings.readerLang || 'en-US';
    u.rate = settings.readerRate;
    try {
      const voices = window.speechSynthesis?.getVoices?.() ?? [];
      const chosen = settings.readerVoiceURI ? voices.find(v => v.voiceURI === settings.readerVoiceURI) : null;
      const best = chosen || bestVoiceFor(voices, settings.readerLang || 'en-US');
      if (best) { u.voice = best; u.lang = best.lang || u.lang; }
    } catch {}
    let gotBoundary = false;
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (runIdRef.current !== runId) return;
      if (typeof e?.charIndex === 'number') { gotBoundary = true; setActiveChar(e.charIndex); }
    };
    u.onend = () => { if (runIdRef.current !== runId) return; setActiveChar(null); speakVerse(i+1, runId); };
    u.onerror = () => { if (runIdRef.current !== runId) return; setTtsState('idle'); };
    window.setTimeout(() => { if (runIdRef.current !== runId) return; if (!gotBoundary) setBoundarySupported(false); }, 900);
    window.speechSynthesis.speak(u);
  }

  function listen() {
    if (!lines.length) { setError('Load a chapter or verse range first.'); return; }
    setError(null);
    if (ttsState === 'paused') { resume(); return; }
    stop();
    const runId = runIdRef.current;
    speakVerse(0, runId);
  }

  useEffect(() => {
    if (!settings.readerAutoFollow || activeIdx == null) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(`btc-v-${activeIdx}`);
      if (!el) return;
      el.scrollIntoView({ block:'center', behavior: settings.reduceMotion ? 'auto' : 'smooth' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeIdx, settings.readerAutoFollow, settings.reduceMotion]);

  return (
    <div className="btc-root" style={{ paddingBottom: 110 }}>
      <BottomNav />

      <div className="btc-card">
        {/* Aurora header */}
        <div style={{
          borderRadius: 18, padding: 16,
          background: 'linear-gradient(135deg, var(--btc-aurora-from, rgba(59,130,246,0.14)), var(--btc-aurora-to, rgba(34,197,94,0.12)))',
          border: '1px solid var(--btc-border)',
          color: 'var(--btc-text)',
        }}>
          <h1 style={{ margin:0, color:'var(--btc-text)' }}>Read &amp; Listen</h1>
          <p style={{ marginTop:6, marginBottom:0, color:'var(--btc-text-muted)' }}>
            Choose a chapter or verse range. Tap Listen for follow-along highlighting.
          </p>
        </div>

        {/* Book + Chapter */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:10, marginTop:12 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Book</span>
            <select value={book} onChange={e => setBook(e.target.value)} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)' }}>
              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Chapter</span>
            <input inputMode="numeric" value={chapter} onChange={e => setChapter(clamp(parseInt(e.target.value||'1',10),1,150))}
              style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)' }} />
          </label>
        </div>

        {/* Mode pills */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:10, alignItems:'center' }}>
          {(['chapter','range'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              padding:'8px 14px', borderRadius:999, cursor:'pointer',
              border: mode===m ? '2px solid var(--btc-accent)' : '1px solid var(--btc-border)',
              background: mode===m ? 'var(--btc-accent-soft)' : 'var(--btc-btn-bg)',
              color: 'var(--btc-text)', fontWeight: mode===m ? 700 : 500,
            }}>
              {m === 'chapter' ? 'Whole chapter' : 'Verse range'}
            </button>
          ))}
          <a href="/settings" style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.15)',
              background: 'white',
              color: '#374151',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⚙️ Reader settings
            </a>
        </div>

        {mode === 'range' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Start verse</span>
              <input inputMode="numeric" value={startVerse} onChange={e => setStartVerse(clamp(parseInt(e.target.value||'1',10),1,176))}
                style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)' }} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>End verse (optional)</span>
              <input inputMode="numeric" value={endVerse} onChange={e => setEndVerse(e.target.value==='' ? '' : clamp(parseInt(e.target.value,10),1,176))}
                style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)' }} />
            </label>
          </div>
        )}

        {/* Controls */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
          {[
            { label: loading ? 'Loading…' : 'Load', onClick: load, disabled: loading, primary: false },
            { label: ttsState === 'paused' ? 'Resume' : 'Listen', onClick: listen, disabled: !lines.length, primary: true },
            { label: 'Pause', onClick: pause, disabled: ttsState !== 'speaking', primary: false },
            { label: 'Stop', onClick: stop, disabled: ttsState === 'idle', primary: false },
          ].map(btn => (
            <button key={btn.label} type="button" onClick={btn.onClick} disabled={btn.disabled} style={{
              padding:'10px 16px', borderRadius:12, cursor: btn.disabled ? 'default' : 'pointer',
              fontWeight: btn.primary ? 800 : 500,
              opacity: btn.disabled ? 0.45 : 1,
              background: btn.primary ? 'var(--btc-accent-soft)' : 'var(--btc-btn-bg)',
              color: btn.primary ? 'var(--btc-accent)' : 'var(--btc-text)',
              border: btn.primary ? '1.5px solid var(--btc-accent)' : '1px solid var(--btc-btn-border)',
            }}>
              {btn.label}
            </button>
          ))}
          <span style={{ flex:'1 1 auto' }} />
          <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>
            {lines.length ? `${lines.length} verses` : 'No passage loaded'}
            {ttsState !== 'idle' && activeIdx != null ? ` • ${progress}%` : ''}
          </span>
        </div>

        {error && <div style={{ marginTop:10, color:'#ef4444', fontWeight:700 }}>{error}</div>}

        {/* Verse display */}
        <div style={{
          marginTop:14, padding:14, borderRadius:16,
          background:'var(--btc-surface)', lineHeight:1.7,
          fontSize: settings.readerFontSize, maxWidth:820,
          color:'var(--btc-text)',
          border:'1px solid var(--btc-border)',
        }}>
          {!lines.length ? (
            <span style={{ color:'var(--btc-text-muted)' }}>Load a chapter or range to display it here.</span>
          ) : lines.map((l, idx) => {
            const active = idx === activeIdx && ttsState !== 'idle';
            const range = active && boundarySupported && activeChar != null ? computeWordRange(l.text, activeChar) : null;
            return (
              <p key={`${l.chapter}:${l.verse}:${idx}`} id={`btc-v-${idx}`} style={{
                margin:'0 0 12px 0', padding: active ? '8px 10px' : '4px 10px',
                borderRadius:12,
                background: active ? 'var(--btc-accent-soft)' : 'transparent',
                borderLeft: active ? '4px solid var(--btc-accent)' : '4px solid transparent',
                color:'var(--btc-text)',
              }}>
                <strong style={{ marginRight:8, color:'var(--btc-accent)', fontSize:'0.85em' }}>
                  {l.chapter}:{l.verse}
                </strong>
                {active && range ? (
                  <>
                    {l.text.slice(0, range.start)}
                    <mark style={{ padding:'2px 4px', borderRadius:4, background:'#FFD600', color:'#111', fontWeight:700, boxShadow:'0 0 0 1px rgba(0,0,0,0.15)' }}>
                      {l.text.slice(range.start, range.end)}
                    </mark>
                    {l.text.slice(range.end)}
                  </>
                ) : l.text}
              </p>
            );
          })}
        </div>

        {!boundarySupported && ttsState !== 'idle' && (
          <div style={{ marginTop:10, fontSize:12, color:'var(--btc-text-muted)' }}>
            Word highlighting not available for this voice/browser. Verse highlighting is active instead.
          </div>
        )}
      </div>
    </div>
  );
}
