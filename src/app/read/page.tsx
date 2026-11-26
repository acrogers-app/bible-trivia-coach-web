'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import BottomNav from '../../components/BottomNav';
import { applySettingsToDocument, loadSettings, onSettingsChanged, type AppSettings } from '../../lib/appSettings';
import { getTodayKey, updateStreakForToday } from '../../lib/streakUtils';
import { apiUrl } from '../../lib/apiBase';
import { chapterCount, verseCount } from '../../lib/bibleStructure';
import { useDuoSplit } from '../../lib/duoLayout';
import DuoSplit from '../../components/duo/DuoSplit';

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

// Recorded narration for whole chapters (pilot: Mark, Sunny Singh), bundled with the app by
// scripts/buildChapterAudio.mjs. The manifest carries the WEB text too, so a narrated chapter
// reads and plays offline. A clip is used only when its verse text matches exactly, and only
// when every loaded verse has one, so a passage is never read in mixed voices.
const CHAPTER_AUDIO_MANIFEST = '/data/chapter_audio_en_v1.json';
const CHAPTER_AUDIO_DIR = '/audio/chapters/';
// Same as Learn: clips are made at ElevenLabs speed 1.1 and played 10% faster, pitch kept.
const RECORDED_PLAYBACK_RATE = 1.1;
type ChapterAudio = { label?: string; chapters?: Record<string, { v: number; text: string; file: string }[]> };

function recordedUrlsFor(m: ChapterAudio | null, book: string, lines: VerseLine[]): string[] | null {
  if (!m?.chapters || !lines.length) return null;
  const urls: string[] = [];
  for (const l of lines) {
    const hit = m.chapters[`${book} ${l.chapter}`]?.find((x) => x.v === l.verse);
    if (!hit || hit.text !== l.text.trim()) return null;
    urls.push(CHAPTER_AUDIO_DIR + hit.file);
  }
  return urls;
}

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
  const chapterState = chapter;
  const [startVerse, setStartVerse] = useState(16);
  const [endVerse, setEndVerse] = useState<number|''>('');
  // Pickers only offer chapters and verses that exist in the WEB (lib/bibleStructure).
  const bookIdx = BOOKS.indexOf(book);
  const maxChapter = Math.max(1, chapterCount(bookIdx));
  const maxVerse = Math.max(1, verseCount(bookIdx, chapter));
  const range = (n: number, from = 1) => Array.from({ length: Math.max(0, n - from + 1) }, (_, i) => from + i);
  function chooseBook(b: string) {
    setBook(b);
    const i = BOOKS.indexOf(b);
    const ch = clamp(chapter, 1, Math.max(1, chapterCount(i)));
    setChapter(ch);
    chooseVerses(startVerse, endVerse, i, ch);
  }
  function chooseChapter(ch: number) {
    setChapter(ch);
    chooseVerses(startVerse, endVerse, bookIdx, ch);
  }
  function chooseVerses(sv: number, ev: number|'', i = bookIdx, ch = chapter) {
    const max = Math.max(1, verseCount(i, ch));
    const s2 = clamp(sv, 1, max);
    setStartVerse(s2);
    setEndVerse(ev === '' || ev <= s2 ? '' : clamp(ev, s2, max));
  }
  const [mode, setMode] = useState<'chapter'|'range'>('chapter');
  const modeState = mode;
  const [lines, setLines] = useState<VerseLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [readMarkedToday, setReadMarkedToday] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return (
        window.localStorage.getItem('btc_reading_last_completed') ===
        getTodayKey()
      );
    } catch {
      return false;
    }
  });
  const [ttsState, setTtsState] = useState<'idle'|'speaking'|'paused'>('idle');
  const [activeIdx, setActiveIdx] = useState<number|null>(null);
  const [sel, setSel] = useState<{ lines: VerseLine[]; idx: number } | null>(null);
  const [activeChar, setActiveChar] = useState<number|null>(null);
  const [boundarySupported, setBoundarySupported] = useState(true);
  const runIdRef = useRef(0);
  const pendingAutoplayRef = useRef(false);
  // Book of the loaded lines (the Book picker can change before Load is pressed).
  const [linesBook, setLinesBook] = useState('');
  const [chapterAudio, setChapterAudio] = useState<ChapterAudio | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordedUrls = useMemo(() => recordedUrlsFor(chapterAudio, linesBook, lines), [chapterAudio, linesBook, lines]);

  useEffect(() => {
    let cancelled = false;
    fetch(CHAPTER_AUDIO_MANIFEST)
      .then((res) => (res.ok ? res.json() : null))
      .then((m: ChapterAudio | null) => { if (!cancelled) setChapterAudio(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
        if (m) { setBook(m[1]); setChapter(parseInt(m[2],10)); setLinesBook(m[1]); }
        setError(null); setLoading(true); stop();
        try {
          const res = await fetch(apiUrl(`/api/passage?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`));
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

  // Stop speech when the user hides or leaves the page
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) stop();
    };
    const onBeforeUnload = () => stop();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      stop();
    };
  }, []); // eslint-disable-line

  const progress = useMemo(() => {
    if (!lines.length || activeIdx == null) return 0;
    return Math.round(((activeIdx+1)/lines.length)*100);
  }, [lines.length, activeIdx]);

  async function load(at?: { chapter: number }) {
    // Chapter buttons in the study companion load a neighbouring chapter directly.
    const chapter = at?.chapter ?? chapterState;
    const mode = at ? 'chapter' : modeState;
    if (at) { setChapter(at.chapter); setMode('chapter'); }
    setError(null); setLoading(true); stop();
    try {
      setLinesBook(book);
      if (mode === 'chapter') {
        // A narrated chapter loads from the bundle, so it works offline.
        const bundled = await fetch(CHAPTER_AUDIO_MANIFEST)
          .then((r) => (r.ok ? r.json() : null))
          .then((m: ChapterAudio | null) => m?.chapters?.[`${book} ${chapter}`] ?? null)
          .catch(() => null);
        if (bundled?.length) {
          setLines(bundled.map((x) => ({ chapter, verse: x.v, text: x.text })));
          return;
        }
        const res = await fetch(apiUrl(`/api/chapter?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(String(chapter))}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
        setLines(Array.isArray(data?.lines) ? data.lines : []);
        return;
      }
      const sv = startVerse;
      const ev = endVerse === '' ? startVerse : Number(endVerse);
      const res = await fetch(apiUrl(`/api/passage?start=${encodeURIComponent(`${book} ${chapter}:${sv}`)}&end=${encodeURIComponent(`${book} ${chapter}:${ev}`)}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setLines(Array.isArray(data?.lines) ? data.lines : []);
    } catch(e) { setLines([]); setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setLoading(false); }
  }

  function markAsRead() {
    try {
      window.localStorage.setItem('btc_reading_last_completed', getTodayKey());
    } catch {
      // ignore
    }
    updateStreakForToday();
    setReadMarkedToday(true);
  }

  function stopAudio() {
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    try { a.pause(); } catch {}
    a.removeAttribute('src');
    try { a.load(); } catch {}
  }

  function stop() {
    runIdRef.current++;
    stopAudio();
    try { window.speechSynthesis?.cancel(); } catch {}
    setTtsState('idle'); setActiveIdx(null); setActiveChar(null); setBoundarySupported(true);
  }

  function pause() {
    if (recordedUrls) { try { audioRef.current?.pause(); } catch {} }
    else { try { window.speechSynthesis?.pause(); } catch {} }
    setTtsState('paused');
  }

  function resume() {
    if (recordedUrls) { audioRef.current?.play().catch(() => stop()); }
    else { try { window.speechSynthesis?.resume(); } catch {} }
    setTtsState('speaking');
  }

  function speakVerse(i: number, runId: number) {
    if (runIdRef.current !== runId) return;
    if (i >= lines.length) { setTtsState('idle'); setActiveIdx(null); setActiveChar(null); return; }
    const line = lines[i];
    setActiveIdx(i); setSel({ lines, idx: i }); setActiveChar(0); setTtsState('speaking');
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

  function playClip(urls: string[], i: number, runId: number) {
    if (runIdRef.current !== runId) return;
    if (i >= urls.length) { setTtsState('idle'); setActiveIdx(null); return; }
    setActiveIdx(i); setSel({ lines, idx: i }); setActiveChar(null); setTtsState('speaking');
    const a = audioRef.current ?? (audioRef.current = new Audio());
    a.onended = () => playClip(urls, i + 1, runId);
    a.onerror = () => { if (runIdRef.current === runId) { setTtsState('idle'); setActiveIdx(null); } };
    a.src = urls[i];
    a.preservesPitch = true;
    a.playbackRate = RECORDED_PLAYBACK_RATE;
    a.defaultPlaybackRate = RECORDED_PLAYBACK_RATE;
    a.play().catch(() => { if (runIdRef.current === runId) { setTtsState('idle'); setActiveIdx(null); } });
  }

  function listen(from = 0) {
    if (!lines.length) { setError('Load a chapter or verse range first.'); return; }
    setError(null);
    if (ttsState === 'paused' && from === 0) { resume(); return; }
    stop();
    const runId = runIdRef.current;
    const start = clamp(from, 0, lines.length - 1);
    if (recordedUrls) playClip(recordedUrls, start, runId);
    else speakVerse(start, runId);
  }

  // Two panes on a large or unfolded display (iPhone Duo inner display, iPad): passage + study companion.
  const duo = useDuoSplit();
  const twoPane = duo.mode !== 'single';
  // Verse shown in the study companion: the one being read, else the one the reader tapped.
  // Tied to the loaded lines, so loading another passage clears it; playback records each verse it reads.
  const selIdx = sel && sel.lines === lines ? sel.idx : null;
  const currentIdx = ttsState !== 'idle' && activeIdx != null ? activeIdx : selIdx;
  function selectVerse(idx: number) {
    setSel({ lines, idx });
    if (ttsState !== 'idle') listen(idx); // playing: carry on from the chosen verse
  }
  function stepVerse(delta: number) {
    const next = clamp((currentIdx ?? 0) + delta, 0, Math.max(0, lines.length - 1));
    selectVerse(next);
    document.getElementById(`btc-v-${next}`)?.scrollIntoView({ block:'center', behavior: settings.reduceMotion ? 'auto' : 'smooth' });
  }

  // Two panes: a newly loaded passage starts at its first verse (the pane keeps its own scroll).
  useEffect(() => {
    if (!twoPane) return;
    document.getElementById('btc-v-0')?.closest('.duo-pane')?.scrollTo(0, 0);
  }, [lines, twoPane]);

  useEffect(() => {
    if (!settings.readerAutoFollow || activeIdx == null) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(`btc-v-${activeIdx}`);
      if (!el) return;
      el.scrollIntoView({ block:'center', behavior: settings.reduceMotion ? 'auto' : 'smooth' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeIdx, settings.readerAutoFollow, settings.reduceMotion]);

  if (twoPane) {
    const cur = currentIdx != null ? lines[currentIdx] : null;
    const prevCh = chapterState > 1 ? chapterState - 1 : null;
    const nextCh = chapterState < maxChapter ? chapterState + 1 : null;
    const smallBtn = { minHeight:44, padding:'8px 12px', borderRadius:12, cursor:'pointer', fontWeight:600,
      background:'var(--btc-btn-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-btn-border)' } as const;
    const companion = (
      <>
        <h1 style={{ margin:'0 0 4px', fontSize:24, color:'var(--btc-text)' }}>Read &amp; Listen</h1>
        {/* Controls */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
          {[
            // two-pane: Load sits with the passage picker further down the companion
            ...(twoPane ? [] : [{ label: loading ? 'Loading…' : 'Load', onClick: () => load(), disabled: loading, primary: false }]),
            { label: ttsState === 'paused' ? 'Resume' : 'Listen', onClick: () => listen(), disabled: !lines.length, primary: true },
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

        {recordedUrls && (
          <p style={{ marginTop:8, marginBottom:0, fontSize:13, color:'var(--btc-text-muted)' }}>
            <span aria-hidden="true">🎧 </span>Narrated by {chapterAudio?.label || 'a recorded narrator'}. Works offline.
          </p>
        )}

        {error && <div style={{ marginTop:10, color:'#ef4444', fontWeight:700 }}>{error}</div>}

        {/* Study companion: the verse being read or selected, kept in step with the passage pane. */}
        <section aria-label="Current verse" style={{ marginTop:14, padding:14, borderRadius:16, background:'var(--btc-surface)', border:'1px solid var(--btc-border)' }}>
          <div style={{ fontSize:12, fontWeight:800, letterSpacing:0.4, textTransform:'uppercase', color:'var(--btc-text-muted)' }}>
            {ttsState === 'speaking' ? 'Now reading' : ttsState === 'paused' ? 'Paused at' : 'Selected verse'}
          </div>
          {cur ? (
            <>
              <div aria-live="polite" style={{ marginTop:4, fontWeight:800, fontSize:18, color:'var(--btc-text)' }}>
                {linesBook} {cur.chapter}:{cur.verse}
                <span style={{ marginLeft:8, fontSize:13, fontWeight:500, color:'var(--btc-text-muted)' }}>
                  verse {(currentIdx ?? 0) + 1} of {lines.length}
                </span>
              </div>
              <p style={{ margin:'8px 0 0', lineHeight:1.6, color:'var(--btc-text)', fontSize:`calc(15px * var(--learn-dt-head, 1))` }}>{cur.text}</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                <button type="button" style={smallBtn} disabled={(currentIdx ?? 0) <= 0} onClick={() => stepVerse(-1)}>‹ Previous verse</button>
                <button type="button" style={smallBtn} disabled={(currentIdx ?? 0) >= lines.length - 1} onClick={() => stepVerse(1)}>Next verse ›</button>
                {ttsState === 'idle' && (
                  <button type="button" onClick={() => listen(currentIdx ?? 0)} style={{ ...smallBtn, fontWeight:800, background:'var(--btc-accent-soft)', color:'var(--btc-accent)', border:'1.5px solid var(--btc-accent)' }}>
                    Listen from {cur.chapter}:{cur.verse}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p style={{ margin:'6px 0 0', color:'var(--btc-text-muted)' }}>
              {lines.length ? 'Tap a verse number in the passage to follow along here.' : 'Load a passage to start.'}
            </p>
          )}
        </section>

        {mode === 'chapter' && lines.length > 0 && (prevCh || nextCh) && (
          <nav aria-label="Chapters" style={{ display:'flex', gap:8, marginTop:12 }}>
            {prevCh && <button type="button" style={{ ...smallBtn, flex:1 }} onClick={() => { setChapter(prevCh); void load({ chapter: prevCh }); }}>‹ {book} {prevCh}</button>}
            {nextCh && <button type="button" style={{ ...smallBtn, flex:1 }} onClick={() => { setChapter(nextCh); void load({ chapter: nextCh }); }}>{book} {nextCh} ›</button>}
          </nav>
        )}

        <h2 style={{ margin:'18px 0 0', fontSize:15, color:'var(--btc-text-muted)' }}>Choose a passage</h2>
        {/* Book + Chapter */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 110px', gap:10, marginTop:8 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Book</span>
            <select value={book} onChange={e => chooseBook(e.target.value)} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Chapter</span>
            <select value={chapter} onChange={e => chooseChapter(parseInt(e.target.value,10))} aria-label={`Chapter, ${maxChapter} in ${book}`} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
              {range(maxChapter).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        {/* Mode pills */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:10, alignItems:'center' }}>
          {(['chapter','range'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              padding:'8px 14px', borderRadius:22, cursor:'pointer',
              border: mode===m ? '2px solid var(--btc-accent)' : '1px solid var(--btc-border)',
              background: mode===m ? 'var(--btc-accent-soft)' : 'var(--btc-btn-bg)',
              color: 'var(--btc-text)', fontWeight: mode===m ? 700 : 500,
            }}>
              {m === 'chapter' ? 'Whole chapter' : 'Verse range'}
            </button>
          ))}
          <Link href="/settings" style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 14px',
              borderRadius: 22,
              border: '1px solid var(--btc-border)',
              background: 'var(--btc-surface)',
              color: 'var(--btc-text-mid)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⚙️ Reader settings
            </Link>
        </div>

        {mode === 'range' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Start verse</span>
              <select value={startVerse} onChange={e => chooseVerses(parseInt(e.target.value,10), endVerse)} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
                {range(maxVerse).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>End verse (optional)</span>
              <select value={endVerse === '' ? '' : endVerse} onChange={e => chooseVerses(startVerse, e.target.value === '' ? '' : parseInt(e.target.value,10))} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
                <option value="">Just verse {startVerse}</option>
                {range(maxVerse, startVerse + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        )}

        <button type="button" onClick={() => load()} disabled={loading} style={{ marginTop:12, minHeight:44, padding:'8px 16px', borderRadius:12, cursor:'pointer', fontWeight:700,
          background:'var(--btc-btn-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-btn-border)' }}>
          {loading ? 'Loading…' : `Load ${book} ${mode === 'chapter' ? chapter : `${chapter}:${startVerse}${endVerse === '' ? '' : `–${endVerse}`}`}`}
        </button>
      </>
    );
    const passage = (
      <>
        {/* Verse display */}
        <div style={{
          marginTop:14, padding:14, borderRadius:16,
          background:'var(--btc-surface)', lineHeight:1.7,
          // reader size setting x iPhone text size at half strength (--learn-dt-head, SystemTextScale)
          fontSize: `calc(${settings.readerFontSize}px * var(--learn-dt-head, 1))`,
          // Two-pane: a comfortable measure (~70 characters) however wide the pane is.
          maxWidth: twoPane ? '36em' : 820, marginInline: twoPane ? 'auto' : undefined,
          color:'var(--btc-text)',
          border:'1px solid var(--btc-border)',
        }}>
          {!lines.length ? (
            <span style={{ color:'var(--btc-text-muted)' }}>
              Load a chapter or range to display it here.
              {twoPane && !loading && (
                <button type="button" onClick={() => load()} style={{ display:'block', marginTop:12, minHeight:44, padding:'8px 16px', borderRadius:12, cursor:'pointer', fontWeight:800,
                  background:'var(--btc-accent-soft)', color:'var(--btc-accent)', border:'1.5px solid var(--btc-accent)' }}>
                  Load {book} {mode === 'chapter' ? chapter : `${chapter}:${startVerse}${endVerse === '' ? '' : `–${endVerse}`}`}
                </button>
              )}
            </span>
          ) : lines.map((l, idx) => {
            const active = idx === activeIdx && ttsState !== 'idle';
            const chosen = twoPane && !active && idx === selIdx;
            const range = active && boundarySupported && activeChar != null ? computeWordRange(l.text, activeChar) : null;
            return (
              <p key={`${l.chapter}:${l.verse}:${idx}`} id={`btc-v-${idx}`}
                onClick={twoPane ? () => selectVerse(idx) : undefined}
                style={{
                margin:'0 0 12px 0', padding: active ? '8px 10px' : '4px 10px',
                borderRadius:12,
                background: active ? 'var(--btc-accent-soft)' : 'transparent',
                borderLeft: active ? '4px solid var(--btc-accent)' : chosen ? '4px solid var(--btc-text-muted)' : '4px solid transparent',
                outline: chosen ? '1px dashed var(--btc-border)' : undefined,
                color:'var(--btc-text)',
                cursor: twoPane ? 'pointer' : undefined,
              }}>
                {twoPane ? (
                  // Two-pane: the verse number selects the verse for the study companion.
                  <button type="button" onClick={(e) => { e.stopPropagation(); selectVerse(idx); }}
                    aria-pressed={idx === selIdx} aria-label={`Verse ${l.chapter}:${l.verse}, select`}
                    style={{ marginRight:8, padding:'0 2px', minHeight:28, border:'none', background:'none', cursor:'pointer',
                      color:'var(--btc-accent)', fontSize:'0.85em', fontWeight:800, textDecoration: idx === selIdx ? 'underline' : 'none' }}>
                    {l.chapter}:{l.verse}
                  </button>
                ) : (
                <strong style={{ marginRight:8, color:'var(--btc-accent)', fontSize:'0.85em' }}>
                  {l.chapter}:{l.verse}
                </strong>
                )}
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

        {lines.length > 0 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {readMarkedToday ? (
              <p style={{ fontSize: 14, margin: 0, color: 'var(--btc-text-muted)' }}>
                ✓ Today&rsquo;s reading is complete — well done taking time in
                God&rsquo;s Word.
              </p>
            ) : (
              <button type="button" onClick={markAsRead} style={{
                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                fontWeight: 800,
                background: 'var(--btc-accent-soft)',
                color: 'var(--btc-accent)',
                border: '1.5px solid var(--btc-accent)',
              }}>
                Mark as read
              </button>
            )}
          </div>
        )}

        {lines.length > 0 && (
          <p style={{ marginTop: 14, fontSize: 12, textAlign: 'center', color: 'var(--btc-text-muted)' }}>
            Scripture quotations are from the World English Bible (WEB), public domain.
          </p>
        )}
      </>
    );
    return (
      <div className="btc-root">
        <BottomNav />
        <div className="btc-card">
          <DuoSplit layout={duo} primary={passage} secondary={companion}
            primaryLabel={lines.length ? `Passage, ${linesBook} ${lines[0].chapter}` : 'Passage'}
            secondaryLabel="Study companion" />
        </div>
      </div>
    );
  }

  return (
    <div className="btc-root" style={{ paddingBottom: ttsState !== 'idle' ? 180 : 110 }}>
      <BottomNav />

      {/* While reading, Pause/Resume and Stop float above the tab bar so they stay in reach
          as the text scrolls along. */}
      {ttsState !== 'idle' && (
        <div role="region" aria-label="Reading controls" style={{
          // side insets keep the bar out of reserved columns (e.g. iPhone Duo's camera/status column)
          position:'fixed', zIndex:40,
          left:'calc(12px + env(safe-area-inset-left))', right:'calc(12px + env(safe-area-inset-right))',
          bottom:'calc(80px + env(safe-area-inset-bottom))',
          maxWidth:560, margin:'0 auto',
          display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
          borderRadius:16, background:'var(--btc-nav-bg)',
          border:'1px solid var(--btc-border)', boxShadow:'0 6px 24px rgba(0,0,0,0.35)',
        }}>
          <span aria-live="polite" style={{ flex:'1 1 auto', fontSize:14, fontWeight:600, color:'var(--btc-text)' }}>
            {ttsState === 'paused' ? 'Paused' : 'Reading'}
            {activeIdx != null && lines[activeIdx] ? ` ${linesBook} ${lines[activeIdx].chapter}:${lines[activeIdx].verse}` : ''}
          </span>
          <button type="button" onClick={ttsState === 'paused' ? resume : pause} style={{
            minHeight:44, padding:'8px 16px', borderRadius:12, cursor:'pointer', fontWeight:800,
            background:'var(--btc-accent-soft)', color:'var(--btc-accent)', border:'1.5px solid var(--btc-accent)',
          }}>
            {ttsState === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button type="button" onClick={stop} style={{
            minHeight:44, padding:'8px 16px', borderRadius:12, cursor:'pointer', fontWeight:600,
            background:'var(--btc-btn-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-btn-border)',
          }}>
            Stop
          </button>
        </div>
      )}

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
            <select value={book} onChange={e => chooseBook(e.target.value)} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
              {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Chapter</span>
            <select value={chapter} onChange={e => chooseChapter(parseInt(e.target.value,10))} aria-label={`Chapter, ${maxChapter} in ${book}`} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
              {range(maxChapter).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        {/* Mode pills */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:10, alignItems:'center' }}>
          {(['chapter','range'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              padding:'8px 14px', borderRadius:22, cursor:'pointer',
              border: mode===m ? '2px solid var(--btc-accent)' : '1px solid var(--btc-border)',
              background: mode===m ? 'var(--btc-accent-soft)' : 'var(--btc-btn-bg)',
              color: 'var(--btc-text)', fontWeight: mode===m ? 700 : 500,
            }}>
              {m === 'chapter' ? 'Whole chapter' : 'Verse range'}
            </button>
          ))}
          <Link href="/settings" style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 14px',
              borderRadius: 22,
              border: '1px solid var(--btc-border)',
              background: 'var(--btc-surface)',
              color: 'var(--btc-text-mid)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⚙️ Reader settings
            </Link>
        </div>

        {mode === 'range' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>Start verse</span>
              <select value={startVerse} onChange={e => chooseVerses(parseInt(e.target.value,10), endVerse)} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
                {range(maxVerse).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--btc-text-muted)' }}>End verse (optional)</span>
              <select value={endVerse === '' ? '' : endVerse} onChange={e => chooseVerses(startVerse, e.target.value === '' ? '' : parseInt(e.target.value,10))} style={{ padding:10, borderRadius:12, background:'var(--btc-input-bg)', color:'var(--btc-text)', border:'1px solid var(--btc-input-border)', fontSize:16 }}>
                <option value="">Just verse {startVerse}</option>
                {range(maxVerse, startVerse + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        )}

        {/* Controls */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
          {[
            // two-pane: Load sits with the passage picker further down the companion
            ...(twoPane ? [] : [{ label: loading ? 'Loading…' : 'Load', onClick: () => load(), disabled: loading, primary: false }]),
            { label: ttsState === 'paused' ? 'Resume' : 'Listen', onClick: () => listen(), disabled: !lines.length, primary: true },
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

        {recordedUrls && (
          <p style={{ marginTop:8, marginBottom:0, fontSize:13, color:'var(--btc-text-muted)' }}>
            <span aria-hidden="true">🎧 </span>Narrated by {chapterAudio?.label || 'a recorded narrator'}. Works offline.
          </p>
        )}

        {error && <div style={{ marginTop:10, color:'#ef4444', fontWeight:700 }}>{error}</div>}

        {/* Verse display */}
        <div style={{
          marginTop:14, padding:14, borderRadius:16,
          background:'var(--btc-surface)', lineHeight:1.7,
          // reader size setting x iPhone text size at half strength (--learn-dt-head, SystemTextScale)
          fontSize: `calc(${settings.readerFontSize}px * var(--learn-dt-head, 1))`,
          // Two-pane: a comfortable measure (~70 characters) however wide the pane is.
          maxWidth: twoPane ? '36em' : 820, marginInline: twoPane ? 'auto' : undefined,
          color:'var(--btc-text)',
          border:'1px solid var(--btc-border)',
        }}>
          {!lines.length ? (
            <span style={{ color:'var(--btc-text-muted)' }}>
              Load a chapter or range to display it here.
              {twoPane && !loading && (
                <button type="button" onClick={() => load()} style={{ display:'block', marginTop:12, minHeight:44, padding:'8px 16px', borderRadius:12, cursor:'pointer', fontWeight:800,
                  background:'var(--btc-accent-soft)', color:'var(--btc-accent)', border:'1.5px solid var(--btc-accent)' }}>
                  Load {book} {mode === 'chapter' ? chapter : `${chapter}:${startVerse}${endVerse === '' ? '' : `–${endVerse}`}`}
                </button>
              )}
            </span>
          ) : lines.map((l, idx) => {
            const active = idx === activeIdx && ttsState !== 'idle';
            const chosen = twoPane && !active && idx === selIdx;
            const range = active && boundarySupported && activeChar != null ? computeWordRange(l.text, activeChar) : null;
            return (
              <p key={`${l.chapter}:${l.verse}:${idx}`} id={`btc-v-${idx}`}
                onClick={twoPane ? () => selectVerse(idx) : undefined}
                style={{
                margin:'0 0 12px 0', padding: active ? '8px 10px' : '4px 10px',
                borderRadius:12,
                background: active ? 'var(--btc-accent-soft)' : 'transparent',
                borderLeft: active ? '4px solid var(--btc-accent)' : chosen ? '4px solid var(--btc-text-muted)' : '4px solid transparent',
                outline: chosen ? '1px dashed var(--btc-border)' : undefined,
                color:'var(--btc-text)',
                cursor: twoPane ? 'pointer' : undefined,
              }}>
                {twoPane ? (
                  // Two-pane: the verse number selects the verse for the study companion.
                  <button type="button" onClick={(e) => { e.stopPropagation(); selectVerse(idx); }}
                    aria-pressed={idx === selIdx} aria-label={`Verse ${l.chapter}:${l.verse}, select`}
                    style={{ marginRight:8, padding:'0 2px', minHeight:28, border:'none', background:'none', cursor:'pointer',
                      color:'var(--btc-accent)', fontSize:'0.85em', fontWeight:800, textDecoration: idx === selIdx ? 'underline' : 'none' }}>
                    {l.chapter}:{l.verse}
                  </button>
                ) : (
                <strong style={{ marginRight:8, color:'var(--btc-accent)', fontSize:'0.85em' }}>
                  {l.chapter}:{l.verse}
                </strong>
                )}
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

        {lines.length > 0 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {readMarkedToday ? (
              <p style={{ fontSize: 14, margin: 0, color: 'var(--btc-text-muted)' }}>
                ✓ Today&rsquo;s reading is complete — well done taking time in
                God&rsquo;s Word.
              </p>
            ) : (
              <button type="button" onClick={markAsRead} style={{
                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                fontWeight: 800,
                background: 'var(--btc-accent-soft)',
                color: 'var(--btc-accent)',
                border: '1.5px solid var(--btc-accent)',
              }}>
                Mark as read
              </button>
            )}
          </div>
        )}

        {lines.length > 0 && (
          <p style={{ marginTop: 14, fontSize: 12, textAlign: 'center', color: 'var(--btc-text-muted)' }}>
            Scripture quotations are from the World English Bible (WEB), public domain.
          </p>
        )}
      </div>
    </div>
  );
}
