import { createSignal, Signal } from 'solid-js';

// JSON has no date type: JSON.stringify writes a Date as an ISO-8601 string, so
// a naive round-trip hands back strings where the app expects Dates. Datasets
// are type-coerced to Dates when loaded (typeCoerceData), and the stored
// datastore is read straight back into that same invariant — without this,
// every temporal comparison downstream of a reload silently misses (the
// sonification's traversal-state -> datum lookup finds nothing, so every note
// becomes a rest and playback is inaudible while the chart still renders).
// Match only the exact shape JSON.stringify emits for a Date, so ordinary
// string columns are left alone.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const reviveDates = (_key: string, value: unknown) => (typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value);

export function createStoredSignal<T>(key: string, defaultValue: T, storage = localStorage): Signal<T> {
  const initialValue = storage.getItem(key) ? (JSON.parse(storage.getItem(key)!, reviveDates) as T) : defaultValue;

  const [value, setValue] = createSignal<T>(initialValue);

  const setValueAndStore = ((arg) => {
    if (arg) {
      const v = setValue(arg);
      storage.setItem(key, JSON.stringify(v));
      return v;
    }
  }) as typeof setValue;

  return [value, setValueAndStore];
}
