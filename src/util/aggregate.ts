import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { UmweltDataset } from '../types';

export function aggregate(field: string, op: NonArgAggregateOp, data: UmweltDataset): number {
  if (data.length) {
    switch (op) {
      case 'mean':
        return data.reduce((sum, d) => sum + Number(d[field]), 0) / data.length;
      case 'median':
        const datum = data[Math.floor(data.length / 2)];
        return Number(datum[field]);
      case 'min':
        return Math.min(...data.map((datum) => Number(datum[field])));
      case 'max':
        return Math.max(...data.map((datum) => Number(datum[field])));
      case 'sum':
        return data.reduce((a, b) => a + Number(b[field]), 0);
      case 'count':
        return data.length;
      default:
        throw new Error(`Unknown aggregate operation: ${op}`);
    }
  } else if (op === 'count') {
    return 0;
  }
  return NaN;
}
