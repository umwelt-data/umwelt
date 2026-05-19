import { createContext, useContext, ParentProps } from 'solid-js';
import { AudioEncoding, AudioPropName, ResolvedFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../../types';
import { useUmweltSpec } from '../UmweltSpecContext';
import { getDomain } from '../../util/domain';
import { scaleOrdinal, scaleLinear, scaleTime } from 'd3-scale';
import { getFieldDef, resolveFieldDef } from '../../util/spec';
import { computeAxisTicks } from '@umwelt-data/umwelt-utils/vega';

export type AudioScalesProviderProps = ParentProps<{
  spec: UmweltSpec;
  data: UmweltDataset;
  encoding: AudioEncoding;
}>;

export interface AudioScales {
  pitch: (value: any) => number; // TODO typings
  duration: (value: any) => number;
  volume: (value: any) => number;
}

export interface AudioScaleActions {
  getAxisTicks: (resolvedFieldDef: ResolvedFieldDef) => UmweltValue[];
}

const AudioScalesContext = createContext<[AudioScales, AudioScaleActions]>();

export function AudioScalesProvider(props: AudioScalesProviderProps) {
  const DEFAULT_RANGES: Record<AudioPropName, [number, number]> = {
    pitch: [48, 84], // in MIDI. Three octaves from C3 to C6
    duration: [0.25, 1], // in seconds
    volume: [-20, 0], // in decibels
  };

  const DEFAULT_VALUES: Record<AudioPropName, any> = {
    pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
    duration: 0.2, // seconds
    volume: -10, // dB
  };

  const createAudioScale = (property: AudioPropName) => {
    const encodingFieldDef = props.encoding[property];

    if (!encodingFieldDef) {
      return () => DEFAULT_VALUES[property];
    }

    const fieldDef = getFieldDef(props.spec, encodingFieldDef.field);

    if (!fieldDef) {
      // throw new Error(`Field ${encodingFieldDef.field} not found in spec`);
      console.warn(`Field ${encodingFieldDef.field} not found in spec`);
      return () => DEFAULT_VALUES[property];
    }

    const resolvedFieldDef = resolveFieldDef(fieldDef, encodingFieldDef);

    let domain = resolvedFieldDef.scale?.domain;
    if (!domain) {
      switch (fieldDef.type) {
        case 'ordinal':
        case 'nominal':
          domain = getDomain(resolvedFieldDef, props.data, false);
          break;
        case 'quantitative':
        case 'temporal':
          domain = getDomain(resolvedFieldDef, props.data, false);
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
        return scaleOrdinal<number>()
          .domain(domain as string[])
          .range(range);
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
  };

  const getAxisTicks = (resolvedFieldDef: ResolvedFieldDef): UmweltValue[] => {
    const fieldDef = getFieldDef(props.spec, resolvedFieldDef.field);
    if (!fieldDef) {
      console.warn(`Field ${resolvedFieldDef.field} not found in spec`);
      return [];
    }

    const xyEncodings = fieldDef.encodings.filter((e) => e.property === 'x' || e.property === 'y');
    const channel = xyEncodings[0]?.property as 'x' | 'y' | undefined;
    if (!channel) return [];

    const result = computeAxisTicks(props.data as Record<string, any>[], {
      [channel]: {
        field: resolvedFieldDef.field,
        type: fieldDef.type as 'quantitative' | 'ordinal' | 'nominal' | 'temporal',
      },
    });
    return (result[channel] as UmweltValue[]) ?? [];
  };

  const scales = {
    pitch: createAudioScale('pitch'),
    duration: createAudioScale('duration'),
    volume: createAudioScale('volume'),
  };

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
