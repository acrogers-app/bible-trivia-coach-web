import type { TriviaPack, ReadingPlan } from './models';

// Helper to load JSON from the public/data folder on the server side.
// In Next.js App Router, you can call these from server components or route handlers.

async function loadJson<T>(path: string): Promise<T> {
  // When running on the server, process.cwd() points at the project root.
  const fs = await import('node:fs/promises');
  const fullPath = `${process.cwd()}/public/data/${path}`;
  const raw = await fs.readFile(fullPath, 'utf8');
  return JSON.parse(raw) as T;
}

export async function loadTriviaPack(): Promise<TriviaPack> {
  return loadJson<TriviaPack>('trivia_core_en_v1.json');
}

export async function loadReadingPlan(): Promise<ReadingPlan> {
  return loadJson<ReadingPlan>('gospels_30.json');
}
