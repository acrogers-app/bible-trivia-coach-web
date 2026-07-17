/**
 * Analytics — fire-and-forget, never throws, respects user opt-out.
 * No PII. Only questionId, correct/wrong, difficulty, refs.
 *
 * Offline support: payloads that can't be delivered (device offline or
 * the POST fails) are persisted to an IndexedDB outbox and replayed in
 * order when connectivity returns (see flushAnalyticsOutbox, called on
 * app start and on the window "online" event by OfflineBanner).
 */
import { loadSettings } from './appSettings';
import { apiUrl } from './apiBase';

export type QuizAnswerEvent = {
  questionId:   string;
  questionText: string;
  correct:      boolean;
  selectedText: string;
  correctText:  string;
  difficulty:   string;
  refStart:     string;
  refEnd:       string;
  sourceType:   string;
};

export type QuizAnalyticsPayload = {
  sessionId: string;
  quizTitle: string;
  total:     number;
  correct:   number;
  answers:   QuizAnswerEvent[];
  timestamp: string;
};

export function makeSessionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// IndexedDB outbox
// ---------------------------------------------------------------------------

const OUTBOX_DB = 'btc-outbox';
const OUTBOX_STORE = 'events';
const OUTBOX_MAX = 200; // cap so the outbox can never grow unbounded

function openOutbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(OUTBOX_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        // autoIncrement keys preserve insertion (i.e. chronological) order
        db.createObjectStore(OUTBOX_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Persist a payload to the outbox, evicting the oldest entries beyond the cap. */
async function enqueuePayload(payload: QuizAnalyticsPayload): Promise<void> {
  const db = await openOutbox();
  try {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    const store = tx.objectStore(OUTBOX_STORE);
    await requestAsPromise(store.add(payload));

    // Enforce the cap: drop oldest entries first.
    const count = await requestAsPromise(store.count());
    let excess = count - OUTBOX_MAX;
    if (excess > 0) {
      await new Promise<void>((resolve, reject) => {
        const cursorReq = store.openCursor(); // ascending key order = oldest first
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && excess > 0) {
            cursor.delete();
            excess -= 1;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      });
    }
  } finally {
    db.close();
  }
}

/** Read all queued payloads, oldest first, as [key, payload] pairs. */
async function readOutbox(db: IDBDatabase): Promise<Array<[IDBValidKey, QuizAnalyticsPayload]>> {
  const tx = db.transaction(OUTBOX_STORE, 'readonly');
  const store = tx.objectStore(OUTBOX_STORE);
  const [keys, values] = await Promise.all([
    requestAsPromise(store.getAllKeys()),
    requestAsPromise(store.getAll()),
  ]);
  return keys.map((k, i) => [k, values[i] as QuizAnalyticsPayload]);
}

async function deleteOutboxEntry(db: IDBDatabase, key: IDBValidKey): Promise<void> {
  const tx = db.transaction(OUTBOX_STORE, 'readwrite');
  await requestAsPromise(tx.objectStore(OUTBOX_STORE).delete(key));
}

function postPayload(payload: QuizAnalyticsPayload): Promise<Response> {
  return fetch(apiUrl('/api/analytics'), {
    method:    'POST',
    headers:   { 'Content-Type': 'application/json' },
    body:      JSON.stringify(payload),
    keepalive: true,
  });
}

let flushing = false;

/**
 * Replay queued analytics payloads, oldest first. Stops at the first
 * network failure (payloads stay queued, order preserved). Fire-and-forget:
 * never throws, never blocks the UI. Safe to call repeatedly.
 */
export function flushAnalyticsOutbox(): void {
  try {
    if (typeof window === 'undefined') return;
    if (flushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const settings = loadSettings();
    if (settings.analyticsEnabled === false) return;

    flushing = true;
    void (async () => {
      const db = await openOutbox();
      try {
        const entries = await readOutbox(db);
        for (const [key, payload] of entries) {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
          // If fetch resolves (any status) the attempt was delivered — drop
          // the entry so a server-side rejection can't wedge the queue.
          // If it throws (network down again), keep the rest for later.
          try {
            await postPayload(payload);
          } catch {
            break;
          }
          await deleteOutboxEntry(db, key);
        }
      } finally {
        db.close();
      }
    })()
      .catch(() => {})
      .finally(() => {
        flushing = false;
      });
  } catch {
    flushing = false;
    // Analytics must NEVER break the app
  }
}

export function sendQuizAnalytics(payload: QuizAnalyticsPayload): void {
  try {
    if (typeof window === 'undefined') return;
    const settings = loadSettings();
    if (settings.analyticsEnabled === false) return;

    // Offline: skip the doomed request and queue straight away.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      void enqueuePayload(payload).catch(() => {});
      return;
    }

    // Fire-and-forget — keepalive ensures delivery even during page navigation.
    // On network failure, persist to the outbox for replay when back online.
    postPayload(payload).catch(() => {
      void enqueuePayload(payload).catch(() => {});
    });
  } catch {
    // Analytics must NEVER break the app
  }
}
