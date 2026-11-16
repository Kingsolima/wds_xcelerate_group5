import { useSyncExternalStore } from 'react';

/*
  Tiny persisted stores for what the user does before there is an account: saved listings,
  knocks sent, and things they post. Storage can be missing (private mode, tests) or hold junk;
  either way the store keeps working in memory.
*/

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T, isValid: (value: unknown) => boolean): T {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: keep the in-memory copy.
  }
}

const isStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export type IdSet = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
};

/** A persisted set of ids with a React hook. Exported for tests. */
export function createIdStore(key: string) {
  let ids = readJSON<string[]>(key, [], isStringArray);
  const listeners = new Set<() => void>();

  const store = {
    get: () => ids,
    has: (id: string) => ids.includes(id),
    toggle(id: string) {
      ids = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
      writeJSON(key, ids);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  // Keep other tabs in sync.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== key) return;
      ids = readJSON<string[]>(key, [], isStringArray);
      listeners.forEach((listener) => listener());
    });
  }

  return store;
}

const savedStore = createIdStore('knock:saved');
const knockStore = createIdStore('knock:knocks');

function useIdStore(store: ReturnType<typeof createIdStore>): IdSet {
  const ids = useSyncExternalStore(store.subscribe, store.get, store.get);
  return { ids, has: (id) => ids.includes(id), toggle: store.toggle };
}

/** Listings the user has hearted. */
export const useSaved = () => useIdStore(savedStore);

/** Listings and roommate posts the user has knocked on (shown interest in). */
export const useKnocks = () => useIdStore(knockStore);
