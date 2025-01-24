import { AudioPropName, EncodingFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../types';
import { getFieldDef, resolveFieldDef } from './spec';
import { derivedFieldName } from './transforms';

const DEFAULT_VALUES: Record<AudioPropName, any> = {
  pitch: 60, // MIDI C4 middle C. We encode in MIDI because linear interpolations in Hz are not perceptually linear
  duration: 0.2, // seconds
  volume: -15, // dB
};

export function encodeProperty(prop: AudioPropName, spec: UmweltSpec, encodingFieldDef: EncodingFieldDef | undefined, scale: any, data: UmweltDataset): number {
  if (!encodingFieldDef) {
    return DEFAULT_VALUES[prop];
  }

  const fieldDef = getFieldDef(spec, encodingFieldDef.field);
  if (!fieldDef) {
    return DEFAULT_VALUES[prop];
  }
  const resolvedFieldDef = resolveFieldDef(fieldDef, encodingFieldDef);
  const field = derivedFieldName(resolvedFieldDef);

  // If no aggregation, use the first matching data point
  return scale(data[0][field] as UmweltValue);
}
