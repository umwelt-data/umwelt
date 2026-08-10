import { beforeEach, describe, expect, it } from 'vitest';
import { createRoot } from 'solid-js';
import { createStoredSignal } from '../../src/util/solid';

const storage = (): Storage => {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
};

describe('createStoredSignal', () => {
  let store: Storage;
  beforeEach(() => {
    store = storage();
  });

  it('round-trips a stored value', () => {
    createRoot((dispose) => {
      const [, set] = createStoredSignal('k', { a: 1 }, store);
      set({ a: 2 });
      dispose();
    });
    createRoot((dispose) => {
      const [value] = createStoredSignal('k', { a: 1 }, store);
      expect(value()).toEqual({ a: 2 });
      dispose();
    });
  });

  it('restores Dates as Dates, not ISO strings', () => {
    // datasets are type-coerced to Dates on load; a plain JSON round-trip would
    // hand back strings and silently break every downstream date comparison
    const date = new Date('2000-01-01T07:00:00.000Z');
    createRoot((dispose) => {
      const [, set] = createStoredSignal<{ rows: { date: Date | string }[] }>('data', { rows: [] }, store);
      set({ rows: [{ date }] });
      dispose();
    });
    createRoot((dispose) => {
      const [value] = createStoredSignal<{ rows: { date: Date | string }[] }>('data', { rows: [] }, store);
      const restored = value().rows[0].date;
      expect(restored).toBeInstanceOf(Date);
      expect((restored as Date).getTime()).toBe(date.getTime());
      dispose();
    });
  });

  it('leaves strings that are not the JSON date form alone', () => {
    createRoot((dispose) => {
      const [, set] = createStoredSignal<Record<string, string>>('s', {}, store);
      set({ a: '2000-01-01', b: 'Jan 1 2000', c: '2000-01-01T07:00:00Z' });
      dispose();
    });
    createRoot((dispose) => {
      const [value] = createStoredSignal<Record<string, string>>('s', {}, store);
      expect(value()).toEqual({ a: '2000-01-01', b: 'Jan 1 2000', c: '2000-01-01T07:00:00Z' });
      dispose();
    });
  });
});
