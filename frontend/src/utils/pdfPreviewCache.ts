/**
 * Persistent PDF preview cache using IndexedDB.
 * Survives page reload; evicts by LRU when over size limit.
 */

const DB_NAME = 'dr-birdy-pdf-preview';
const DB_VERSION = 1;
const STORE_NAME = 'pdf-blobs';
const META_KEY = '__meta__';
const MAX_CACHE_BYTES = 100 * 1024 * 1024; // 100 MB

interface CacheEntry {
  url: string;
  data: ArrayBuffer;
  size: number;
  lastAccessed: number;
}

interface CacheMeta {
  url: string;
  totalSize: number;
  lastAccessed: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('byLastAccessed', 'lastAccessed', { unique: false });
      }
    };
  });
}

/**
 * Get cached PDF bytes for a URL, or undefined if not in cache.
 * Updates lastAccessed so LRU eviction is accurate.
 */
export async function getPdfFromPersistentCache(url: string): Promise<ArrayBuffer | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (!entry || !entry.data) {
          db.close();
          resolve(undefined);
          return;
        }
        entry.lastAccessed = Date.now();
        store.put(entry);
        tx.oncomplete = () => {
          db.close();
          resolve(entry.data);
        };
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    return undefined;
  }
}

/**
 * Store PDF bytes in persistent cache and evict by LRU if over limit.
 */
export async function setPdfInPersistentCache(url: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    const size = data.byteLength;
    const now = Date.now();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('byLastAccessed');

      const getMetaReq = store.get(META_KEY);
      const getOldReq = store.get(url);

      let meta: CacheMeta = { url: META_KEY, totalSize: 0, lastAccessed: 0 };
      let oldSize = 0;

      const run = () => {
        const entry: CacheEntry = { url, data, size, lastAccessed: now };
        store.put(entry);
        let newTotal = meta.totalSize - oldSize + size;
        meta.totalSize = newTotal;
        meta.lastAccessed = now;
        store.put(meta);

        if (newTotal <= MAX_CACHE_BYTES) {
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          return;
        }

        // Evict oldest entries until under limit
        const cursorReq = index.openCursor();

        cursorReq.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (!cursor) {
            meta.totalSize = newTotal;
            store.put(meta);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            return;
          }
          const row = cursor.value as CacheEntry;
          if (row.url === META_KEY) {
            cursor.continue();
            return;
          }
          if (newTotal <= MAX_CACHE_BYTES) {
            meta.totalSize = newTotal;
            store.put(meta);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            return;
          }
          newTotal -= row.size;
          cursor.delete();
          cursor.continue();
        };
        cursorReq.onerror = () => {
          db.close();
          reject(cursorReq.error);
        };
      };

      getMetaReq.onsuccess = () => {
        if (getMetaReq.result) meta = getMetaReq.result as CacheMeta;
        getOldReq.onsuccess = () => {
          if (getOldReq.result) oldSize = (getOldReq.result as CacheEntry).size;
          run();
        };
      };
      getMetaReq.onerror = () => reject(getMetaReq.error);
      getOldReq.onerror = () => reject(getOldReq.error);
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn('PDF persistent cache write failed:', e);
  }
}
