import { createContext, useContext, ParentProps } from 'solid-js';
import { AudioEncodingFieldDef, AudioPropName } from '../../types';
import { useUmweltSpec } from '../UmweltSpecContext';
import { getDomain } from '../../util/domain';
import { scaleOrdinal, scaleLinear } from 'd3-scale';
import { getFieldDef } from '../../util/spec';

export type AudioScalesProviderProps = ParentProps<{}>;

export type AudioScalesActions = {};

export interface AudioScales {}

const AudioScalesContext = createContext<[AudioScales, AudioScalesActions]>();

export function AudioScalesProvider(props: AudioScalesProviderProps) {
  const [spec] = useUmweltSpec();

  const DEFAULT_VALUES: Record<AudioPropName, any> = {
    pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
    duration: 0.2, // seconds
    volume: -15, // dB
  };

  const DEFAULT_RANGES: Record<AudioPropName, [number, number]> = {
    pitch: [48, 84], // in MIDI. Three octaves from C3 to C6
    duration: [0.25, 1], // in seconds
    volume: [-30, -6], // in decibels // TODO check JND, 3db possibly?
  };

  const createAudioScale = (property: AudioPropName, encoding: AudioEncodingFieldDef): ((value: any) => number) => {
    const fieldDef = getFieldDef(spec, encoding.field);

    if (!fieldDef) {
      throw new Error(`Field ${encoding.field} not found in spec`);
    }

    const domain = encoding.scale?.domain || getDomain(encoding, spec.data.values);
    const range = (encoding.scale?.range as number[]) || DEFAULT_RANGES[property]; // TODO support non-number ranges

    switch (fieldDef.type) {
      case 'ordinal':
      case 'nominal':
        return scaleOrdinal<number>()
          .domain(domain as string[])
          .range(DEFAULT_RANGES[property]);
      case 'quantitative':
        return scaleLinear()
          .domain(domain as number[])
          .range(DEFAULT_RANGES[property]);
      case 'temporal':
      //...
      default:
        throw new Error(`Unsupported field type ${fieldDef.type}`);
    }
  };

  return <AudioScalesContext.Provider value={[AudioScalesState, actions]}>{props.children}</AudioScalesContext.Provider>;
}

export function useAudioScales() {
  const context = useContext(AudioScalesContext);
  if (context === undefined) {
    throw new Error('useSonificationRuntime must be used within a SonificationRuntimeProvider');
  }
  return context;
}
