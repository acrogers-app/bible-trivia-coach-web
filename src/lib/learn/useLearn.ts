'use client';

// Client hooks for Learn: content + question bank loading, on-device progress,
// and the review gate. No analytics and no network calls beyond the app's own
// static JSON (Scripture text is fetched separately by ScripturePassage).

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  usableLessons,
  type CheckQuestion,
  type LearnContent,
  type LearnLesson,
  type LearnTopic,
} from './content';
import { LEARN_PROGRESS_KEY, parseProgress, saveLearnProgress, type LearnProgress } from './progress';

/** Preview builds (NEXT_PUBLIC_LEARN_PREVIEW=1) show draft lessons with a banner. Never for release. */
export const LEARN_PREVIEW = process.env.NEXT_PUBLIC_LEARN_PREVIEW === '1';

export interface LearnData {
  topics: LearnTopic[];
  bank: Map<string, CheckQuestion>;
  preview: boolean;
}

/** A topic with only the lessons a learner can use (approved + full 5-question check). */
export interface UsableTopic {
  topic: LearnTopic;
  lessons: LearnLesson[];
}

let cache: Promise<LearnData> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return (await res.json()) as T;
}

async function load(): Promise<LearnData> {
  const [content, pack] = await Promise.all([
    fetchJson<LearnContent>('/data/topics_en_v1.json'),
    fetchJson<{ questions: CheckQuestion[] }>('/packs/trivia_core_en_v1.json'),
  ]);
  let topics = content.topics;
  if (LEARN_PREVIEW) {
    // Preview builds only: draft fixture copied in from content/learn/preview.json
    // (see content/learn/README.md). Never present in release builds.
    const fixture = await fetchJson<LearnContent>('/data/learn_preview_fixture.json');
    const byId = new Map(fixture.topics.map((t) => [t.id, t]));
    topics = topics.map((t) => byId.get(t.id) ?? t);
  }
  return {
    topics,
    bank: new Map(pack.questions.map((q) => [q.id, q])),
    preview: LEARN_PREVIEW,
  };
}

export function loadLearnData(): Promise<LearnData> {
  if (!cache) {
    cache = load().catch((e) => {
      cache = null;
      throw e;
    });
  }
  return cache;
}

export function useLearnData(): { data: LearnData | null; error: string | null } {
  const [data, setData] = useState<LearnData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLearnData().then(
      (d) => { if (!cancelled) setData(d); },
      (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load lessons.'); },
    );
    return () => { cancelled = true; };
  }, []);
  return { data, error };
}

/** Topics that have at least one usable lesson, in file order. */
export function useUsableTopics(data: LearnData | null): UsableTopic[] {
  return useMemo(() => {
    if (!data) return [];
    return data.topics
      .map((topic) => ({ topic, lessons: usableLessons(topic, data.bank, data.preview) }))
      .filter((t) => t.lessons.length > 0);
  }, [data]);
}

// ---- Progress (localStorage via useSyncExternalStore) ----

const CHANGE_EVENT = 'btc-learn-progress-change';

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(LEARN_PROGRESS_KEY);
  } catch {
    return null;
  }
}

export function useLearnProgress(): [LearnProgress, (next: LearnProgress) => void] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const progress = useMemo(() => parseProgress(raw), [raw]);
  const update = useCallback((next: LearnProgress) => {
    saveLearnProgress(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [progress, update];
}

// ---- Clock (minute resolution; keeps render pure) ----

function subscribeClock(cb: () => void): () => void {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
}
function clockSnapshot(): number {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

/** Current time for review-ready decisions, rounded to the minute. 0 during prerender. */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, clockSnapshot, () => 0);
}
