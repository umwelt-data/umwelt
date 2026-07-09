import { createContext, useContext, ParentProps } from 'solid-js';
import { AudioPropName, AudioUnitSpec, ResolvedFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../../types';
import { useUmweltSpec } from '../UmweltSpecContext';
import { getDomain } from '../../util/domain';
import { scaleOrdinal, scaleLinear, scaleTime, scalePoint } from 'd3-scale';
import { getFieldDef, resolveAudioUnitFields, resolveFieldDef } from '../../util/spec';
import { derivedDataset } from '../../util/transforms';
import { audioUnitFieldBins, chartAxisTicks } from '../../util/ticks';

export type AudioScalesProviderProps = ParentProps<{
  spec: UmweltSpec;
  data: UmweltDataset;
  audioUnitSpec: AudioUnitSpec;
}>;

export interface AudioScales {
  pitch: (value: any) => number; // TODO typings
  duration: (value: any) => number;
  volume: (value: any) => number;
  pan: (value: any) => number; // stereo position in [-1, 1]
}

export interface AudioScaleActions {
  getAxisTicks: (resolvedFieldDef: ResolvedFieldDef) => UmweltValue[];
}

const AudioScalesContext = createContext<[AudioScales, AudioScaleActions]>();

const DEFAULT_RANGES: Record<AudioPropName, [number, number]> = {
  pitch: [48, 84], // in MIDI. Three octaves from C3 to C6
  duration: [0.25, 1], // in seconds
  volume: [-20, 0], // in decibels
  // stereo position. ±0.9 rather than ±1 so the extremes stay unambiguously
  // lateral without ever going fully single-channel — full pan drops the off ear
  // to silence (fatiguing on headphones, inaudible for single-sided hearing loss).
  pan: [-0.9, 0.9],
};

const DEFAULT_VALUES: Record<AudioPropName, any> = {
  pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
  duration: 0.2, // seconds
  volume: -10, // dB
  pan: 0, // center
};

// Nominal/ordinal fields map to a continuous audio channel via evenly spaced
// positions across the range extent (Vega-Lite's nominal→position lowering).
//
// scaleOrdinal, which we used before, CYCLES its range: a 2-value range across
// 3+ categories collapses distinct categories onto the same value (category 3 ==
// category 1). A point scale spaces them without collision. For 1–2 categories
// the two agree exactly, so this changes output only where it was previously
// broken.
//
// Exception: an explicit range with exactly one value per category is an
// author-chosen mapping — honored directly (cardinalities match, so no cycling).
function createOrdinalAudioScale(domain: UmweltValue[], range: number[], property: AudioPropName): (value: any) => number {
  if (range.length === domain.length) {
    const ordinal = scaleOrdinal<number>()
      .domain(domain as string[])
      .range(range);
    return (value: any) => ordinal(value);
  }
  const extent: [number, number] = [Math.min(...range), Math.max(...range)];
  if (range.length !== 2) {
    console.warn(`Audio ${property} scale range has ${range.length} values for ${domain.length} categories; ignoring it and spacing evenly across [${extent[0]}, ${extent[1]}].`);
  }
  // Key the point scale by stringified category so heterogeneous UmweltValues
  // (incl. Dates rendered ordinally) intern consistently on both sides.
  // align(0) pins a lone category to the range start (matching the previous
  // scaleOrdinal output); for >= 2 categories both endpoints are always used, so
  // align has no effect there.
  const point = scalePoint<string>()
    .domain(domain.map(String))
    .range(extent)
    .align(0);
  return (value: any) => point(String(value)) ?? extent[0];
}

function createAudioScale(spec: UmweltSpec, data: UmweltDataset, audioUnitSpec: AudioUnitSpec, property: AudioPropName) {
  const encodingFieldDef = audioUnitSpec.encoding[property];

  if (!encodingFieldDef) {
    return () => DEFAULT_VALUES[property];
  }

  const fieldDef = getFieldDef(spec, encodingFieldDef.field);

  if (!fieldDef) {
    // throw new Error(`Field ${encodingFieldDef.field} not found in spec`);
    console.warn(`Field ${encodingFieldDef.field} not found in spec`);
    return () => DEFAULT_VALUES[property];
  }

  const resolvedFieldDef = resolveFieldDef(fieldDef, encodingFieldDef);

  let domain = resolvedFieldDef.scale?.domain;
  if (!domain) {
    // count and sum produce values in different units than the raw field, so
    // their domains must come from the unit's aggregated data; other
    // aggregates (mean, min, ...) stay within the raw field's extents
    const derivedUnits = resolvedFieldDef.aggregate === 'count' || resolvedFieldDef.aggregate === 'sum';
    const resolvedFields = resolveAudioUnitFields(spec, audioUnitSpec);
    const domainData = derivedUnits ? derivedDataset(data, resolvedFields, audioUnitFieldBins(spec, data, data, resolvedFields)) : data;
    switch (fieldDef.type) {
      case 'ordinal':
      case 'nominal':
        domain = getDomain(resolvedFieldDef, domainData, derivedUnits);
        break;
      case 'quantitative':
      case 'temporal':
        domain = getDomain(resolvedFieldDef, domainData, derivedUnits);
        domain = [domain[0], domain[domain.length - 1]]; // scaleLinear expects extents
        break;
      default:
        throw new Error(`Unsupported field type ${resolvedFieldDef.type}`);
    }
  }
  const range = (resolvedFieldDef.scale?.range as number[]) || DEFAULT_RANGES[property]; // TODO support non-number ranges

  switch (resolvedFieldDef.type) {
    case 'ordinal':
    case 'nominal':
      return createOrdinalAudioScale(domain as UmweltValue[], range, property);
    case 'quantitative':
      return scaleLinear()
        .domain(domain as number[])
        .range(range);
    case 'temporal':
      return scaleTime()
        .domain(domain as Date[])
        .range(range);
    default:
      throw new Error(`Unsupported field type ${resolvedFieldDef.type}`);
  }
}

/** Build the pitch/duration/volume scales for a single audio unit. */
export function buildAudioScales(spec: UmweltSpec, data: UmweltDataset, audioUnitSpec: AudioUnitSpec): AudioScales {
  return {
    pitch: createAudioScale(spec, data, audioUnitSpec, 'pitch'),
    duration: createAudioScale(spec, data, audioUnitSpec, 'duration'),
    volume: createAudioScale(spec, data, audioUnitSpec, 'volume'),
    pan: createAudioScale(spec, data, audioUnitSpec, 'pan'),
  };
}

/** Axis ticks for a resolved field, mirroring the chart axis (used for spoken announcements). */
export function audioAxisTicks(spec: UmweltSpec, data: UmweltDataset, field: string): UmweltValue[] {
  return chartAxisTicks(spec, data, field) ?? [];
}

export function AudioScalesProvider(props: AudioScalesProviderProps) {
  const getAxisTicks = (resolvedFieldDef: ResolvedFieldDef): UmweltValue[] => {
    return audioAxisTicks(props.spec, props.data, resolvedFieldDef.field);
  };

  const scales = buildAudioScales(props.spec, props.data, props.audioUnitSpec);

  const scaleActions = {
    getAxisTicks,
  };

  return <AudioScalesContext.Provider value={[scales, scaleActions]}>{props.children}</AudioScalesContext.Provider>;
}

export function useAudioScales() {
  const context = useContext(AudioScalesContext);
  if (context === undefined) {
    throw new Error('useSonificationRuntime must be used within a SonificationRuntimeProvider');
  }
  return context;
}
