// Pure sonification note-generation, extracted from AudioUnitStateContext so that
// both the concat path (one AudioUnitStateProvider per unit) and the layer path
// (AudioLayerGroupProvider, many units sharing one traversal) can reuse it.
//
// Everything here is a plain function of a `SonifyContext` snapshot — no Solid
// reactivity, no Tone.js. Callers build the context from their own reactive
// memos and wrap these in memos of their own.

import type { LogicalAnd, FieldEqualPredicate, FieldRangePredicate, FieldValue } from '@umwelt-data/umwelt-utils/predicate';
import { serializeValue } from '@umwelt-data/umwelt-utils/data';
import { describeField, makeCommaSeparatedString } from '@umwelt-data/umwelt-utils/description';
import fastCartesian from 'fast-cartesian';
import { AudioUnitSpec, ResolvedFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../types';
import type { AudioScales } from '../contexts/sonification/AudioScalesContext';
import { getFieldDef, resolveFieldDef } from './spec';
import { getBinnedDomain } from './domain';
import { derivedFieldName, derivedFieldNameBinStartEnd } from './transforms';
import { encodeProperty } from './encoding';
import { selectionTest } from './selection';
import { fmtCompoundValue } from './description';

export interface EncodedNote {
  duration: number; // duration in seconds
  pitch: number | undefined; // midi, or undefined for noise/rest
  volume: number; // decibels
}

// Field -> index into that field's (possibly shared) domain
export type TraversalState = Record<string, number>;

export interface SonifierNote extends EncodedNote {
  time: number; // elapsed time when should play in transport, in seconds
  state: TraversalState; // traversal state corresponding to this note
  speakBefore?: string; // text to speak before playing
  pauseAfter?: number; // in seconds
  ramp?: boolean; // whether to ramp this note
  rest?: boolean; // true when this unit has no datum at this traversal step -> silence
}

/**
 * Immutable snapshot the pure note-gen functions operate over. `fieldDomains`
 * may be the unit's own domains (concat) or a shared union domain (layer); the
 * functions don't care which.
 */
export interface SonifyContext {
  spec: UmweltSpec;
  audioUnitSpec: AudioUnitSpec;
  derivedData: UmweltDataset;
  fieldDomains: Record<string, UmweltValue[]>;
  axisTicks: Record<string, UmweltValue[]>;
  scales: AudioScales;
  pauseBetweenSections: number;
}

const traversalFieldDef = (ctx: SonifyContext, field: string) => ctx.audioUnitSpec.traversal.find((f) => f.field === field)!;

export function getDomainValue(ctx: SonifyContext, field: string, idx: number): UmweltValue | [UmweltValue, UmweltValue] {
  const fieldDef = getFieldDef(ctx.spec, field)!;
  const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef(ctx, field));
  const domain = ctx.fieldDomains[field];
  if (resolvedFieldDef.bin && !resolvedFieldDef.aggregate) {
    const [startField, endField] = derivedFieldNameBinStartEnd(resolvedFieldDef);
    const startValue = domain[idx];
    // an out-of-range index or an empty domain (e.g. a selection that matches
    // no data) has no backing row; degrade gracefully rather than throw
    const endValue = ctx.derivedData.find((d) => d[startField] === startValue)?.[endField] ?? null;
    return [startValue, endValue];
  } else {
    return domain[idx];
  }
}

export function getPredicateForState(ctx: SonifyContext, traversalState: TraversalState) {
  return {
    and: Object.entries(traversalState).map(([field, idx]) => {
      const value = getDomainValue(ctx, field, idx);
      const lastIndex = ctx.fieldDomains[field].length - 1;
      if (Array.isArray(value)) {
        return {
          field,
          range: value,
          inclusiveLeft: true,
          inclusiveRight: idx === lastIndex,
        } as FieldRangePredicate;
      } else {
        return {
          field,
          equal: value,
        } as FieldEqualPredicate;
      }
    }),
  };
}

function traversalStateToData(ctx: SonifyContext, traversalState: TraversalState): UmweltDataset {
  const predicate: LogicalAnd<FieldEqualPredicate> = {
    and: Object.entries(traversalState).map(([field, index]) => {
      const value = ctx.fieldDomains[field][index];
      const fieldDef = getFieldDef(ctx.spec, field);
      if (!fieldDef) {
        return { field, equal: value };
      }
      const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef(ctx, field));
      const derivedField = derivedFieldName(resolvedFieldDef);
      return {
        field: derivedField,
        equal: serializeValue(value, fieldDef) as FieldValue,
      };
    }),
  };
  return selectionTest(ctx.derivedData, predicate);
}

function encodeDataAsNote(ctx: SonifyContext, data: UmweltDataset): EncodedNote {
  const encoding = ctx.audioUnitSpec.encoding;
  return {
    pitch: data.length ? encodeProperty('pitch', ctx.spec, encoding.pitch, ctx.scales.pitch, data) : undefined,
    volume: encodeProperty('volume', ctx.spec, encoding.volume, ctx.scales.volume, data),
    duration: encodeProperty('duration', ctx.spec, encoding.duration, ctx.scales.duration, data),
  };
}

function countEndingSectionsOfState(ctx: SonifyContext, state: TraversalState): number {
  const ends = Object.entries(state)
    .map(([field, index]) => {
      return index === ctx.fieldDomains[field].length - 1 ? 1 : 0;
    })
    .reverse();
  let endCount = 0;
  for (let x of ends) {
    if (x) {
      endCount++;
    } else break;
  }
  return endCount;
}

export function shouldRamp(ctx: SonifyContext): boolean {
  if (ctx.audioUnitSpec.traversal.length === 0) {
    return false;
  }
  const innermostField = ctx.audioUnitSpec.traversal[ctx.audioUnitSpec.traversal.length - 1].field;
  const fieldDef = getFieldDef(ctx.spec, innermostField);
  return fieldDef?.type === 'quantitative' || fieldDef?.type === 'temporal';
}

export function getAllTraversalStates(ctx: SonifyContext): TraversalState[] {
  const traversalFields = ctx.audioUnitSpec.traversal.map((f) => f.field);
  const domainLengths = traversalFields.map((field) => Array.from({ length: ctx.fieldDomains[field].length }, (_, i) => i));

  const indexCombinations = fastCartesian(domainLengths);

  return indexCombinations.map((combination) => {
    const result: TraversalState = {};
    combination.forEach((index, fieldIndex) => {
      result[traversalFields[fieldIndex]] = index;
    });
    return result;
  });
}

function hasCrossedAxisTick(ctx: SonifyContext, state: TraversalState, prevState: TraversalState | undefined, resolvedDef: ResolvedFieldDef): boolean {
  if (!prevState) {
    return true; // first state
  }

  if (resolvedDef.bin || resolvedDef.type === 'nominal' || resolvedDef.type === 'ordinal') {
    return state[resolvedDef.field] !== prevState[resolvedDef.field];
  }

  const domain = ctx.axisTicks[resolvedDef.field] ?? [];

  const currentData = traversalStateToData(ctx, state);
  const prevData = traversalStateToData(ctx, prevState);

  if (currentData.length && prevData.length) {
    const fieldName = derivedFieldName(resolvedDef);
    const currentValue = currentData[0][fieldName];
    const prevValue = prevData[0][fieldName];

    if (currentValue && prevValue) {
      const currentTickIdx = domain.findIndex((tick, idx) => {
        const v = tick instanceof Date ? tick.getTime() : tick;
        const nextTick = domain[idx + 1];
        const v2 = nextTick instanceof Date ? nextTick.getTime() : nextTick;
        return v && currentValue >= v && currentValue < (v2 || Infinity);
      });
      const prevTickIdx = domain.findIndex((tick, idx) => {
        const v = tick instanceof Date ? tick.getTime() : tick;
        const nextTick = domain[idx + 1];
        const v2 = nextTick instanceof Date ? nextTick.getTime() : nextTick;
        return v && prevValue >= v && prevValue < (v2 || Infinity);
      });

      return currentTickIdx !== prevTickIdx;
    }
  }

  return false;
}

function getAnnouncementForNote(ctx: SonifyContext, state: TraversalState, prevState?: TraversalState): string {
  const announcement: string[] = [];
  Object.entries(state).forEach(([field]) => {
    const domain = ctx.fieldDomains[field];
    if (!domain.length) return;

    const fieldDef = getFieldDef(ctx.spec, field)!;
    const resolvedDef = resolveFieldDef(fieldDef, traversalFieldDef(ctx, field));

    if (hasCrossedAxisTick(ctx, state, prevState, resolvedDef)) {
      announcement.push(fmtCompoundValue(getDomainValue(ctx, field, state[field]), resolvedDef));
    }
  });
  return announcement.join(', ');
}

export function computeSonifierNotes(ctx: SonifyContext): SonifierNote[] {
  let currentTime = 0;
  const notes: SonifierNote[] = [];

  const allTraversalStates = getAllTraversalStates(ctx);
  const ramp = shouldRamp(ctx);

  let prevState: TraversalState | undefined = undefined;
  allTraversalStates.forEach((state) => {
    const data = traversalStateToData(ctx, state);
    const note = encodeDataAsNote(ctx, data);

    const endingSections = countEndingSectionsOfState(ctx, state);
    const pauseAfter = ctx.pauseBetweenSections * endingSections;

    notes.push({
      ...note,
      time: currentTime,
      pauseAfter,
      ramp,
      rest: data.length === 0,
      state,
      speakBefore: getAnnouncementForNote(ctx, state, prevState),
    });

    currentTime += note.duration + pauseAfter;
    prevState = state;
  });

  return notes;
}

export function describeEncodings(ctx: SonifyContext): string {
  return makeCommaSeparatedString(
    Object.entries(ctx.audioUnitSpec.encoding)
      .map(([propName, encoding]) => {
        if (encoding) {
          return `${describeField(resolveFieldDef(getFieldDef(ctx.spec, encoding.field)!, encoding))} as ${propName}`;
        }
        return '';
      })
      .filter((x) => x)
  );
}

export function describePlaybackOrder(ctx: SonifyContext): string {
  if (!ctx.audioUnitSpec.traversal.length) {
    return '';
  }

  const innerTraversal = ctx.audioUnitSpec.traversal[ctx.audioUnitSpec.traversal.length - 1];
  const fieldDef = getFieldDef(ctx.spec, innerTraversal.field);
  const resolvedDef = resolveFieldDef(fieldDef!, innerTraversal);

  let domain: UmweltValue[] | [UmweltValue, UmweltValue][];
  if (resolvedDef.bin) {
    domain = getBinnedDomain(resolvedDef, ctx.derivedData);
  } else {
    domain = ctx.fieldDomains[innerTraversal.field];
  }

  let label = '';
  if (domain.length > 1) {
    label = `${describeField(resolvedDef)} from ${fmtCompoundValue(domain[0] as UmweltValue, resolvedDef)} to ${fmtCompoundValue(domain[domain.length - 1] as UmweltValue, resolvedDef)}`;
  } else if (domain.length === 1) {
    label = `${describeField(resolvedDef)} equals ${fmtCompoundValue(domain[0] as UmweltValue, resolvedDef)}`;
  } else {
    label = describeField(resolvedDef);
  }

  const additionalFields = ctx.audioUnitSpec.traversal.slice(0, -1).map((t) => {
    const fieldDef = getFieldDef(ctx.spec, t.field);
    return describeField(resolveFieldDef(fieldDef!, t));
  });

  if (additionalFields.length) {
    label += ` for each ${makeCommaSeparatedString(additionalFields)}`;
  }

  return label;
}
