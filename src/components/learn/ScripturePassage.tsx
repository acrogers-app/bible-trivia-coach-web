'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../lib/apiBase';
import { loadSettings } from '../../lib/appSettings';
import { hasHighQualityVoice, pickReadingVoice, stopSpeech } from '../../lib/speech';
import { formatPassage, type LessonPassage } from '../../lib/learn/content';
import { fs } from '../../lib/learn/textScale';

type VerseLine = { chapter: number; verse: number; text: string };

const LOCAL_PASSAGES = '/data/learn_passages_en_v1.json';
// Recorded narration bundled with the app (scripts/generateLearnAudio.mjs), one set per
// narrator. A narrator is offered only when every verse of the passage has a clip, so a
// passage is never read in mixed voices.
const LOCAL_AUDIO_MANIFEST = '/data/learn_audio_en_v1.json';
const LOCAL_AUDIO_DIR = '/audio/learn/';
const NARRATOR_KEY = 'btc.learnNarrator';
// Clips are generated at ElevenLabs speed 1.1; Allen wanted them a little faster still
// (2026-11-23), so they play 10% faster here, with pitch kept.
const RECORDED_PLAYBACK_RATE = 1.1;
type AudioManifest = {
  voices?: Record<string, { label?: string; verses?: Record<string, { file: string; chars: number }> }>;
};
type Narrator = { key: string; label: string; urls: string[] };

function savedNarrator(): string | null {
  try { return window.localStorage.getItem(NARRATOR_KEY); } catch { return null; }
}
// Preview builds only: log the voice handed to the speech engine and how long each verse
// takes, so a voice change can be checked from the device log (not just the picker).
const DEBUG_VOICE = process.env.NEXT_PUBLIC_LEARN_PREVIEW === '1';

/**
 * Shows Scripture text for one reference from the World English Bible text bundled with the
 * app (falling back to the app's WEB API),
 * with an on-device Listen button. Read-aloud stays inside the lesson (no navigation),
 * uses the voice and speed from Settings (or the best installed voice, via the shared
 * picker in lib/speech), and stops when the lesson is left or the app is hidden.
 */
export default function ScripturePassage({ passage }: { passage: LessonPassage }) {
  const [lines, setLines] = useState<VerseLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // null = not known yet; false = only basic voices installed (show a short tip).
  const [goodVoiceInstalled, setGoodVoiceInstalled] = useState<boolean | null>(null);
  // Recorded narrators that cover the whole passage (empty = use the device voice).
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [narratorKey, setNarratorKey] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const quoteRef = useRef<HTMLQuoteElement | null>(null);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const narrator = narrators.find((n) => n.key === narratorKey) ?? narrators[0] ?? null;
  const clips = narrator?.urls ?? null;
  const canPlay = canSpeak || clips !== null;

  // Match bundled recordings to the loaded verses. A clip is used only if it was made from
  // text of the same length (a cheap guard against stale audio; the validator checks fully).
  useEffect(() => {
    if (!lines?.length) return;
    let cancelled = false;
    const book = passage.start.match(/^(.+?)\s+\d+:\d+$/)?.[1];
    if (!book) return;
    fetch(LOCAL_AUDIO_MANIFEST)
      .then((res) => (res.ok ? res.json() : {}))
      .then((m: AudioManifest) => {
        const found: Narrator[] = [];
        for (const [key, v] of Object.entries(m.voices ?? {})) {
          const urls = lines.map((l) => {
            const c = v.verses?.[`${book} ${l.chapter}:${l.verse}`];
            return c && c.chars === l.text.length ? LOCAL_AUDIO_DIR + c.file : null;
          });
          if (urls.every(Boolean)) found.push({ key, label: v.label || key, urls: urls as string[] });
        }
        if (cancelled) return;
        setNarrators(found);
        setNarratorKey(savedNarrator());
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lines, passage.start]);

  function stopAudio() {
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    try { a.pause(); } catch {}
    a.removeAttribute('src');
    try { a.load(); } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    const key = `${passage.start}|${passage.end}`;
    // Local first: the WEB text bundled with the app (scripts/buildLearnPassages.mjs),
    // so lessons work offline. The server is only a fallback for passages not bundled.
    const fromBundle = fetch(LOCAL_PASSAGES)
      .then((res) => (res.ok ? res.json() : {}))
      .then((all: Record<string, VerseLine[]>) => (Array.isArray(all?.[key]) && all[key].length ? all[key] : null))
      .catch(() => null);
    const fromServer = async () => {
      const res = await fetch(apiUrl(
        `/api/passage?start=${encodeURIComponent(passage.start)}&end=${encodeURIComponent(passage.end)}`,
      ));
      const data = (await res.json().catch(() => ({}))) as { lines?: VerseLine[]; error?: string };
      if (!res.ok) throw new Error(data.error || `Could not load (${res.status})`);
      return Array.isArray(data.lines) ? data.lines : [];
    };
    fromBundle
      .then((local) => local ?? fromServer())
      .then((l) => { if (!cancelled) setLines(l); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this passage.');
      });
    return () => { cancelled = true; };
  }, [passage.start, passage.end]);

  function stop() {
    runIdRef.current++;
    stopAudio();
    try { stopSpeech(); } catch {}
    setSpeaking(false);
    setPaused(false);
    setActiveIdx(null);
  }

  function pauseOrResume() {
    if (paused) {
      if (clips) audioRef.current?.play().catch(() => stop());
      else { try { window.speechSynthesis.resume(); } catch {} }
      setPaused(false);
    } else {
      if (clips) { try { audioRef.current?.pause(); } catch {} }
      else { try { window.speechSynthesis.pause(); } catch {} }
      setPaused(true);
    }
  }

  // Stop reading when the lesson is hidden or left.
  useEffect(() => {
    const run = runIdRef;
    const onHide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      run.current++;
      stopAudio();
      try { stopSpeech(); } catch {}
    };
  }, []);

  // Follow the verse being read so it never sits under the tab bar (scroll-margin in
  // globals.css keeps it clear). Only scrolls when the verse is out of view.
  useEffect(() => {
    if (activeIdx === null) return;
    const el = quoteRef.current?.querySelector<HTMLElement>(`[data-verse-idx="${activeIdx}"]`);
    if (!el) return;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    try { el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } catch {}
  }, [activeIdx]);

  // Voices load asynchronously in WebKit; re-check when the list changes.
  useEffect(() => {
    if (!canSpeak) return;
    const check = () => {
      try {
        const voices = window.speechSynthesis.getVoices?.() ?? [];
        if (!voices.length) return;
        setGoodVoiceInstalled(hasHighQualityVoice(voices, loadSettings().readerLang || 'en-US'));
      } catch {}
    };
    check();
    try { window.speechSynthesis.addEventListener?.('voiceschanged', check); } catch {}
    return () => { try { window.speechSynthesis.removeEventListener?.('voiceschanged', check); } catch {} };
  }, [canSpeak]);

  function speakVerse(all: VerseLine[], i: number, runId: number) {
    if (runIdRef.current !== runId) return;
    if (i >= all.length) { setSpeaking(false); setActiveIdx(null); return; }
    setActiveIdx(i);
    const u = new SpeechSynthesisUtterance(all[i].text);
    try {
      const s = loadSettings();
      u.lang = s.readerLang || 'en-US';
      u.rate = s.readerRate || 1;
      const voice = pickReadingVoice(window.speechSynthesis.getVoices?.() ?? [], s);
      if (voice) { u.voice = voice; u.lang = voice.lang || u.lang; }
    } catch {}
    if (DEBUG_VOICE) {
      let t0 = 0;
      u.onstart = () => { t0 = Date.now(); };
      const v = u.voice;
      const tag = `[learn-voice] v${all[i].verse} voice=${v ? `${v.name}|${v.voiceURI}` : 'none(default)'} lang=${u.lang} rate=${u.rate}`;
      u.onend = () => { console.log(`${tag} ms=${Date.now() - t0}`); speakVerse(all, i + 1, runId); };
    } else {
      u.onend = () => speakVerse(all, i + 1, runId);
    }
    u.onerror = () => { if (runIdRef.current === runId) { setSpeaking(false); setActiveIdx(null); } };
    window.speechSynthesis.speak(u);
  }

  function playClip(urls: string[], i: number, runId: number) {
    if (runIdRef.current !== runId) return;
    if (i >= urls.length) { setSpeaking(false); setActiveIdx(null); return; }
    setActiveIdx(i);
    const a = audioRef.current ?? (audioRef.current = new Audio());
    a.onended = () => playClip(urls, i + 1, runId);
    a.onerror = () => { if (runIdRef.current === runId) { setSpeaking(false); setActiveIdx(null); } };
    a.src = urls[i];
    a.preservesPitch = true;
    a.playbackRate = RECORDED_PLAYBACK_RATE;
    a.defaultPlaybackRate = RECORDED_PLAYBACK_RATE;
    a.play().catch(() => { if (runIdRef.current === runId) { setSpeaking(false); setActiveIdx(null); } });
  }

  function listen() {
    if (!lines?.length) return;
    stop();
    if (clips) {
      const runId = runIdRef.current;
      setSpeaking(true);
      playClip(clips, 0, runId);
      return;
    }
    if (DEBUG_VOICE) {
      const s = loadSettings();
      console.log(`[learn-voice] listen saved=${s.readerVoiceURI || 'auto'} rate=${s.readerRate} voices=${(window.speechSynthesis.getVoices?.() ?? []).filter((v) => v.lang?.startsWith('en')).map((v) => `${v.name}|${v.voiceURI}`).join(', ')}`);
    }
    const runId = runIdRef.current;
    setSpeaking(true);
    speakVerse(lines, 0, runId);
  }

  function chooseNarrator(key: string) {
    if (key === narrator?.key) return;
    stop();
    setNarratorKey(key);
    try { window.localStorage.setItem(NARRATOR_KEY, key); } catch {}
  }

  const ref = formatPassage(passage);
  const readHref = `/read?start=${encodeURIComponent(passage.start)}&end=${encodeURIComponent(passage.end)}`;

  return (
    <figure style={{ margin: '0 0 14px' }}>
      <figcaption style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontWeight: 800, marginBottom: 6, fontSize: fs(16) }}>
        <span role="heading" aria-level={2}>{ref}</span>
        {canPlay && lines && lines.length > 0 ? (
          <button
            type="button"
            className="btc-btn btc-btn-secondary"
            onClick={speaking ? stop : listen}
            aria-label={speaking ? `Stop reading ${ref}` : `Listen to ${ref}`}
            style={{ minHeight: 44, padding: '0 16px', fontSize: fs(15), borderRadius: 22 }}
          >
            <span aria-hidden="true">{speaking ? '■ ' : '▶ '}</span>{speaking ? 'Stop' : 'Listen'}
          </button>
        ) : null}
      </figcaption>
      {narrators.length > 1 ? (
        <div role="radiogroup" aria-label="Narrator" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', fontSize: fs(14), flexWrap: 'wrap' }}>
          <span className="btc-text-muted">Voice:</span>
          {narrators.map((n) => {
            const on = n.key === narrator?.key;
            return (
              <button
                key={n.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => chooseNarrator(n.key)}
                className={on ? 'btc-btn' : 'btc-btn btc-btn-secondary'}
                style={{ minHeight: 44, padding: '0 14px', fontSize: fs(14), borderRadius: 22 }}
              >
                {n.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? (
        <p className="btc-text-muted" style={{ margin: 0 }}>
          {error} <Link href={readHref}>Open {ref} in Read</Link>
        </p>
      ) : lines === null ? (
        <p className="btc-text-muted" style={{ margin: 0 }}>Loading {ref}…</p>
      ) : (
        <blockquote ref={quoteRef} style={{ margin: 0, lineHeight: 1.6, fontSize: fs(16) }}>
          {lines.map((l, i) => (
            <span
              key={`${l.chapter}:${l.verse}`}
              data-verse-idx={i}
              className={i === activeIdx ? 'learn-verse learn-spoken' : 'learn-verse'}
              aria-current={i === activeIdx ? 'true' : undefined}
            >
              <sup style={{ fontSize: fs(11), opacity: 0.6, marginRight: 2 }}>{l.verse}</sup>
              {l.text}{' '}
            </span>
          ))}
        </blockquote>
      )}
      {/* While reading, Pause/Resume and Stop float above the tab bar so they stay in reach
          as the passage scrolls along. */}
      {speaking ? (
        <div role="region" aria-label="Reading controls" style={{
          position: 'fixed', left: 12, right: 12, zIndex: 40,
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          maxWidth: 560, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          borderRadius: 16, background: 'var(--btc-nav-bg)',
          border: '1px solid var(--btc-border)', boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
        }}>
          <span aria-live="polite" style={{ flex: '1 1 auto', fontSize: fs(14), fontWeight: 600 }}>
            {paused ? 'Paused' : 'Reading'}
            {activeIdx != null && lines?.[activeIdx] ? ` ${passage.start.replace(/\s+\d+:\d+$/, '')} ${lines[activeIdx].chapter}:${lines[activeIdx].verse}` : ''}
          </span>
          <button type="button" className="btc-btn" onClick={pauseOrResume}
            style={{ minHeight: 44, padding: '0 16px', fontSize: fs(15), borderRadius: 22 }}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btc-btn btc-btn-secondary" onClick={stop}
            style={{ minHeight: 44, padding: '0 16px', fontSize: fs(15), borderRadius: 22 }}>
            Stop
          </button>
        </div>
      ) : null}
      {speaking && !clips && goodVoiceInstalled === false ? (
        <p className="btc-text-muted" role="note" style={{ margin: '8px 0 0', fontSize: fs(13) }}>
          Listen uses the voices on your device. For a more natural voice, download an
          Enhanced or Premium English voice in your device&apos;s Settings → Accessibility →
          Spoken Content (or Read &amp; Speak) → Voices, then pick it in this app&apos;s Settings.
        </p>
      ) : null}
    </figure>
  );
}
