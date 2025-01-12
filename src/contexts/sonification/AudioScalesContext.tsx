import { createContext, useContext, ParentProps } from 'solid-js';
import { AudioEncoding, AudioEncodingFieldDef, AudioPropName } from '../../types';
import { useUmweltSpec } from '../UmweltSpecContext';
import { getDomain } from '../../util/domain';
import { scaleOrdinal, scaleLinear, scaleTime } from 'd3-scale';
import { getFieldDef } from '../../util/spec';

export type AudioScalesProviderProps = ParentProps<{
  encoding: AudioEncoding;
}>;

export interface AudioScales {
  pitch: (value: any) => number; // TODO typings
  duration: (value: any) => number;
  volume: (value: any) => number;
}

const AudioScalesContext = createContext<AudioScales>();

export function AudioScalesProvider(props: AudioScalesProviderProps) {
  const { encoding } = props;
  const [spec] = useUmweltSpec();

  const DEFAULT_RANGES: Record<AudioPropName, [number, number]> = {
    pitch: [48, 84], // in MIDI. Three octaves from C3 to C6
    duration: [0.25, 1], // in seconds
    volume: [-30, -6], // in decibels // TODO check JND, 3db possibly?
  };

  const DEFAULT_VALUES: Record<AudioPropName, any> = {
    pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
    duration: 0.2, // seconds
    volume: -15, // dB
  };

  const createAudioScale = (property: AudioPropName) => {
    const encodingFieldDef = encoding[property];

    if (!encodingFieldDef) {
      return () => DEFAULT_VALUES[property];
    }

    const fieldDef = getFieldDef(spec, encodingFieldDef.field);

    if (!fieldDef) {
      throw new Error(`Field ${encodingFieldDef.field} not found in spec`);
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

  const scales = {
    pitch: createAudioScale('pitch'),
    duration: createAudioScale('duration'),
    volume: createAudioScale('volume'),
  };

  return <AudioScalesContext.Provider value={scales}>{props.children}</AudioScalesContext.Provider>;
}

export function useAudioScales() {
  const context = useContext(AudioScalesContext);
  if (context === undefined) {
    throw new Error('useSonificationRuntime must be used within a SonificationRuntimeProvider');
  }
  return context;
}
