import { afterEach, describe, expect, test } from 'bun:test';
import { createIdStore, readJSON } from '@/lib/store';

const memory = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
};

describe('id store', () => {
  afterEach(() => {
    memory.clear();
    // @ts-expect-error test shim
    delete globalThis.window;
  });

  test('corrupt JSON in storage falls back to an empty list', () => {
    memory.set('k', '{not json');
    // @ts-expect-error test shim
    globalThis.window = { localStorage: fakeStorage, addEventListener() {} };
    expect(createIdStore('k').get()).toEqual([]);
  });

  test('the wrong shape in storage falls back too', () => {
    expect(readJSON('nope', [], Array.isArray)).toEqual([]);
  });

  test('toggle adds, then removes', () => {
    const store = createIdStore('t');
    store.toggle('a');
    expect(store.has('a')).toBe(true);
    store.toggle('a');
    expect(store.get()).toEqual([]);
  });

  test('works with no storage at all', () => {
    const store = createIdStore('none');
    store.toggle('x');
    expect(store.get()).toEqual(['x']);
  });
});
