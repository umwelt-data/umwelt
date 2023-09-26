import { UmweltSpec } from '../types';

export function printableSpec(spec: UmweltSpec) {
  const { data, ...rest } = spec;
  const printable = { ...rest, data: data.length };
  return JSON.stringify(printable, null, 2);
}
