import { SonifierNote } from '../contexts/sonification/AudioEngineContext';
import { AudioEncoding, AudioEncodingFieldDef, AudioPropName, audioPropNames, EncodingFieldDef, EncodingPropName, FieldDef, NONE, UmweltDataset } from '../types';
import { getDomain } from './domain';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { getFieldDef } from './spec';
import { aggregate } from './aggregate';

const DEFAULT_VALUES: Record<AudioPropName, any> = {
  pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
  duration: 0.2, // seconds
  volume: -15, // dB
};

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
