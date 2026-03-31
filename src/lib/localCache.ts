/**
 * Local caching utilities for stale-while-revalidate patterns.
 *
 * localStorage  → small JSON payloads (<100KB): prefs, streak, church, sayings
 * IndexedDB     → large datasets: saved prayers, Bible chapters
 *
 * All keys are prefixed with user ID to support multi-account.
 */

/* ================================================================== */
/*  localStorage helpers (small JSON data)                            */
/* ================================================================== */

interface CachedItem<T> {
  data: T;
  cachedAt: number;
}

export function getLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedItem<T> = JSON.parse(raw);
    return parsed.data;
  } catch {
    return null;
  }
}

export function getLocalCacheWithTTL<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedItem<T> = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setLocalCache<T>(key: string, data: T): void {
  try {
    const item: CachedItem<T> = { data, cachedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(item));
  } catch {
    // Storage full — non-critical
  }
}

export function removeLocalCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

/* ================================================================== */
/*  IndexedDB helpers (large datasets)                                */
/* ================================================================== */

const IDB_NAME = "keeppraying-data";
const IDB_VERSION = 1;
const IDB_STORE = "app-cache";

function openDataDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getIdbCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDataDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        const val = req.result as CachedItem<T> | undefined;
        resolve(val ? val.data : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getIdbCacheWithTTL<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const db = await openDataDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        const val = req.result as CachedItem<T> | undefined;
        if (!val || Date.now() - val.cachedAt > ttlMs) {
          resolve(null);
        } else {
          resolve(val.data);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setIdbCache<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDataDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ data, cachedAt: Date.now() } satisfies CachedItem<T>, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // non-critical
  }
}

export async function removeIdbCache(key: string): Promise<void> {
  try {
    const db = await openDataDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // no-op
  }
}

/* ================================================================== */
/*  Key builders (user-scoped)                                        */
/* ================================================================== */

export const cacheKeys = {
  boardPrefs: (uid: string) => `kp:boardPrefs:${uid}`,
  streak: (uid: string) => `kp:streak:${uid}`,
  church: (uid: string) => `kp:church:${uid}`,
  sayings: () => `kp:sayings`,
  breathPrayers: () => `kp:breathPrayers`,
  savedPrayers: (uid: string) => `kp:savedPrayers:${uid}`,
  bibleChapter: (versionId: number, book: string, chapter: string) =>
    `kp:bible:${versionId}:${book}:${chapter}`,
  bibleAnnotations: (uid: string, book: string, chapter: string) =>
    `kp:bibleAnnot:${uid}:${book}:${chapter}`,
  biblePosition: (uid: string) => `kp:biblePos:${uid}`,
};
