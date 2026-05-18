import type { UmweltDataset, UmweltPredicate } from '../types';
import { testDatum, predicateToFields } from '@umwelt-data/umwelt-utils/predicate';
import {
  predicateToSelectionStore,
  selectionStoreToSelection,
  type VlSelectionTuple,
  type VlSelectionStore,
} from '@umwelt-data/umwelt-utils/vl-bridge';

export type { VlSelectionTuple, VlSelectionStore };
export { predicateToSelectionStore, selectionStoreToSelection, predicateToFields };

export function selectionTest(data: UmweltDataset, predicate: UmweltPredicate): UmweltDataset {
  return data.filter((datum) => testDatum(datum as Record<string, unknown>, predicate));
}
