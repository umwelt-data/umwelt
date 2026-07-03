import type { UmweltDataset, UmweltPredicate } from '../types';
import { testDatum } from '@umwelt-data/umwelt-utils/predicate';

export function selectionTest(data: UmweltDataset, predicate: UmweltPredicate): UmweltDataset {
  return data.filter((datum) => testDatum(datum as Record<string, unknown>, predicate));
}
