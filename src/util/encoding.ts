import { SonifierNote } from '../contexts/sonification/AudioEngineContext';
import { AudioEncoding, AudioEncodingFieldDef, AudioPropName, audioPropNames, EncodingFieldDef, EncodingPropName, FieldDef, NONE, UmweltDataset } from '../types';
import { getDomain } from './domain';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { getFieldDef } from './spec';
import { aggregate } from './aggregate';

export const DEFAULT_VALUES: Record<AudioPropName, any> = {
  pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
  duration: 0.2, // seconds
  volume: -15, // dB
};

export const DEFAULT_RANGES: Record<AudioPropName, [number, number]> = {
  pitch: [48, 84], // in MIDI. Three octaves from C3 to C6
  duration: [0.25, 1], // in seconds
  volume: [-30, -6], // in decibels // TODO check JND, 3db possibly?
};

function createAudioScale(property: AudioPropName, encoding: AudioEncodingFieldDef, fieldDef: FieldDef, data: UmweltDataset): (value: any) => number {
  const domain = encoding.scale?.domain || getDomain(encoding, data);

  const range = (encoding.scale?.range as number[]) || DEFAULT_RANGES[property]; // TODO support non-number ranges

  // Handle categorical data
  if (typeof domain[0] === 'string') {
    return scaleOrdinal<number>()
      .domain(domain as string[])
      .range(range);
  }

  // Default to linear scale for numerical data
  return scaleLinear()
    .domain(domain as number[]) //TODO does this work on dates?
    .range(range);
}

export function encodeProperty(prop: EncodingPropName, encodingFieldDef: EncodingFieldDef | undefined, scale: any, data: UmweltDataset): number {
  if (!encodingFieldDef) {
    return DEFAULT_VALUES[prop];
  }

  // If aggregation is specified, apply it before scaling
  if (encodingFieldDef.aggregate && encodingFieldDef.aggregate !== NONE) {
    return scale(aggregate(encodingFieldDef.field, encodingFieldDef.aggregate, data));
  }

  // If no aggregation, use the first matching data point
  return scale(data[0][encodingFieldDef.field] as any);
}
