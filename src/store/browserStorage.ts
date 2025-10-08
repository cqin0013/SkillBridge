// src/store/browserStorage.ts
// Resilient storage adapter for redux-persist on the web.
// It probes localStorage → sessionStorage → in-memory Map.
// All methods return Promises to match redux-persist expectations.


interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Optional: enumerate keys (not required by redux-persist but handy). */
  getAllKeys?(): string[];
}

/** In-memory fallback using Map */
function createMemoryStorage(): WebStorageLike {
  const mem = new Map<string, string>();
  return {
    getItem: (key) => (mem.has(key) ? (mem.get(key) as string) : null),
    setItem: (key, value) => {
      mem.set(key, value);
    },
    removeItem: (key) => {
      mem.delete(key);
    },
    getAllKeys: () => Array.from(mem.keys()),
  };
}

/** Verify a DOM Storage works (Safari private mode may throw on setItem). */
function probeDomStorage(storage: Storage | null | undefined): WebStorageLike | null {
  if (!storage) return null;
  try {
    const k = `__persist_probe__${Math.random().toString(36).slice(2)}`;
    storage.setItem(k, k);
    const ok = storage.getItem(k) === k;
    storage.removeItem(k);
    if (!ok) return null;
    // Wrap native Storage into WebStorageLike
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => {
        storage.setItem(key, value);
      },
      removeItem: (key) => {
        storage.removeItem(key);
      },
      getAllKeys: () => {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i += 1) {
          const name = storage.key(i);
          if (typeof name === "string") keys.push(name);
        }
        return keys;
      },
    };
  } catch {
    return null;
  }
}

/** Pick the best available storage once at startup. */
function selectBestStorage(): WebStorageLike {
  if (typeof window === "undefined") {
    // SSR or non-browser environment
    return createMemoryStorage();
  }
  const local = probeDomStorage(window.localStorage);
  if (local) return local;

  const session = probeDomStorage(window.sessionStorage);
  if (session) return session;

  return createMemoryStorage();
}

/** Selected backend (can be swapped to memory on runtime quota errors). */
let backend: WebStorageLike = selectBestStorage();

/** Switch to memory backend if runtime errors occur (e.g., QuotaExceededError). */
function degradeToMemory(): void {
  backend = createMemoryStorage();
}

/** Async facade expected by redux-persist */
const browserStorage = {
  getItem(key: string): Promise<string | null> {
    try {
      return Promise.resolve(backend.getItem(key));
    } catch {
      // On unexpected runtime error, degrade and try memory
      degradeToMemory();
      return Promise.resolve(backend.getItem(key));
    }
  },

  setItem(key: string, value: string): Promise<void> {
    try {
      backend.setItem(key, value);
      return Promise.resolve();
    } catch {
      // Quota or other error → degrade and retry once in memory
      degradeToMemory();
      backend.setItem(key, value);
      return Promise.resolve();
    }
  },

  removeItem(key: string): Promise<void> {
    try {
      backend.removeItem(key);
      return Promise.resolve();
    } catch {
      // Degrade and best-effort remove
      degradeToMemory();
      backend.removeItem(key);
      return Promise.resolve();
    }
  },

  /** Not required by redux-persist. Exposed for diagnostics. */
  getAllKeys(): Promise<string[]> {
    try {
      const fn = backend.getAllKeys;
      return Promise.resolve(fn ? fn.call(backend) : []);
    } catch {
      return Promise.resolve([]);
    }
  },
};

export default browserStorage;
