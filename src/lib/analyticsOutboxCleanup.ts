/**
 * 1.2.7 migration: delete quiz-analytics reports that older versions (1.2.6 and earlier)
 * queued on the device while offline or after a failed send. Analytics are disabled, so
 * these reports are never sent; deleting them keeps the data from sitting on the device.
 *
 * Only the analytics outbox database is deleted. Progress, settings, Learn data and every
 * other IndexedDB database or localStorage key are left alone.
 *
 * No imports, so node --test can load this file directly.
 */
export const ANALYTICS_OUTBOX_DB = 'btc-outbox';

type IdbFactoryLike = Pick<IDBFactory, 'deleteDatabase'>;

/**
 * Deletes the analytics outbox database. Resolves true once it is gone (or never existed),
 * false if IndexedDB is unavailable or the delete fails or is blocked. Never throws.
 */
export function clearAnalyticsOutbox(
  factory: IdbFactoryLike | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB,
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!factory) {
        resolve(false);
        return;
      }
      const req = factory.deleteDatabase(ANALYTICS_OUTBOX_DB);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
