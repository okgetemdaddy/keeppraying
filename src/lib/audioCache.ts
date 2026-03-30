/**
 * IndexedDB-backed local audio cache for instant TTS playback.
 *
 * DB  : keeppraying-audio
 * Store: tts-cache
 *
 * Each entry stores the raw audio Blob and optional phrase-timing JSON
 * so replaying a previously-heard prayer is instant and offline-capable.
 */

export interface CachedAudio {
  blob: Blob;
  phrases: { text: string; start: number }[] | null;
}

const DB_NAME = "keeppraying-audio";
const STORE_NAME = "tts-cache";
const DB_VERSION = 1;

/* ------------------------------------------------------------------ */
/*  Internal: open / create the database                              */
/* ------------------------------------------------------------------ */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Retrieve a cached audio entry by its cache ID.
 * Returns null when nothing is stored locally for this ID.
 */
export async function getCachedAudio(id: string): Promise<CachedAudio | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const val = req.result as
          | { blob: Blob; phrases: CachedAudio["phrases"]; cachedAt: number }
          | undefined;
        resolve(val ? { blob: val.blob, phrases: val.phrases } : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    // IndexedDB unavailable (SSR, private-mode edge-cases) — graceful no-op
    return null;
  }
}

/**
 * Store an audio blob (and optional phrase timing) in the local cache.
 */
export async function setCachedAudio(
  id: string,
  blob: Blob,
  phrases: CachedAudio["phrases"]
): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ blob, phrases, cachedAt: Date.now() }, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-critical — remote cache is the source of truth
  }
}

/**
 * Remove a single entry from the local cache (mirrors admin delete).
 */
export async function removeCachedAudio(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // no-op
  }
}

/**
 * Wipe the entire local audio cache (mirrors admin "Delete All").
 */
export async function clearAudioCache(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // no-op
  }
}
