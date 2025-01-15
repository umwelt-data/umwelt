import { createContext, useContext, ParentProps } from 'solid-js';
import { AudioEncoding, AudioPropName, UmweltValue } from '../../types';
import { useUmweltSpec } from '../UmweltSpecContext';
import { getDomain } from '../../util/domain';
import { scaleOrdinal, scaleLinear, scaleTime } from 'd3-scale';
import { getFieldDef } from '../../util/spec';
import { getVegaAxisTicks } from '../../util/vega';

export type AudioScalesProviderProps = ParentProps<{
  encoding: AudioEncoding;
}>;

export interface AudioScales {
  pitch: (value: any) => number; // TODO typings
  duration: (value: any) => number;
  volume: (value: any) => number;
}

export interface AudioScaleActions {
  getAxisTicks: (field: string) => UmweltValue[];
}

const AudioScalesContext = createContext<[AudioScales, AudioScaleActions]>();

export function AudioScalesProvider(props: AudioScalesProviderProps) {
  const { encoding } = props;
  const [spec] = useUmweltSpec();

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
    const encodingFieldDef = encoding[property];

    if (!encodingFieldDef) {
      return () => DEFAULT_VALUES[property];
    }

    const fieldDef = getFieldDef(spec, encodingFieldDef.field);

    if (!fieldDef) {
      // throw new Error(`Field ${encodingFieldDef.field} not found in spec`);
      console.warn(`Field ${encodingFieldDef.field} not found in spec`);
      return () => DEFAULT_VALUES[property];
    }

    let domain = encodingFieldDef.scale?.domain;
    if (!domain) {
      switch (fieldDef.type) {
        case 'ordinal':
        case 'nominal':
          domain = getDomain(encodingFieldDef, spec.data.values);
          break;
        case 'quantitative':
        case 'temporal':
          domain = getDomain(encodingFieldDef, spec.data.values);
          domain = [domain[0], domain[domain.length - 1]]; // scaleLinear expects extents
          break;
        default:
          throw new Error(`Unsupported field type ${fieldDef.type}`);
      }
    }
    const range = (encodingFieldDef.scale?.range as number[]) || DEFAULT_RANGES[property]; // TODO support non-number ranges

    switch (fieldDef.type) {
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
        throw new Error(`Unsupported field type ${fieldDef.type}`);
    }
  };

  const getAxisTicks = (field: string) => {
    const fieldDef = getFieldDef(spec, field);
    if (!fieldDef) {
      // throw new Error(`Field ${field} not found in spec`);
      console.warn(`Field ${field} not found in spec`);
      return [];
    }

    if ('view' in window) {
      // if we have a vega view, we can get the ticks from the axis
      const xyEncodings = fieldDef.encodings.filter((e) => e.property === 'x' || e.property === 'y');
      if (xyEncodings.length === 1) {
        let ticks;
        // grab ticks from vega
        const vTicks = getVegaAxisTicks(window.view as any);
        if (vTicks && vTicks.length) {
          if (vTicks.length === 1) {
            ticks = vTicks[0];
          } else if (vTicks.length === 2) {
            if (xyEncodings[0].property === 'x') {
              ticks = vTicks[0];
            } else if (xyEncodings[0].property === 'y') {
              ticks = vTicks[1];
            }
          }
        }
        if (ticks) {
          return ticks;
        }
      }
    }

    let domain = getDomain({ field }, spec.data.values);
    if (fieldDef.type === 'ordinal' || fieldDef.type === 'nominal') {
      return domain;
    }
    if (fieldDef.type === 'quantitative') {
      const scale = scaleLinear()
        .domain(domain as number[])
        .range([0, 1]);
      return scale.ticks(5);
    }
    if (fieldDef.type === 'temporal') {
      const scale = scaleTime()
        .domain(domain as Date[])
        .range([0, 1]);
      return scale.ticks(5);
    }
    throw new Error(`Unsupported field type ${fieldDef.type}`);
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
