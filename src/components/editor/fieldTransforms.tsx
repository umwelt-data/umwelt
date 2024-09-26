import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioPropName, audioPropNames, EncodingFieldDef, EncodingRef, FieldDef, VisualPropName, visualPropNames } from '../../types';
import { TimeUnit } from 'vega';

interface FieldTransformsProps {
  field: FieldDef;
  encoding?: EncodingRef;
  fieldLabelId?: string;
}

const aggregateOps: NonArgAggregateOp[] = ['mean', 'median', 'min', 'max', 'sum', 'count'];
const timeUnits = ['year', 'month', 'yearmonth', 'day', 'date', 'hours', 'minutes', 'seconds'];

export function FieldTransforms({ field, encoding, fieldLabelId }: FieldTransformsProps) {
  const [spec, specActions] = useUmweltSpec();

  const canAggregateField = (key: string[], field: FieldDef) => {
    return !key.includes(field.name) && field.type === 'quantitative';
  };
  const canBinField = (field: FieldDef) => {
    return field.type === 'quantitative' || field.type === 'temporal';
  };
  const canTimeUnitField = (field: FieldDef) => {
    return field.type === 'temporal';
  };

  const setAggregate = (aggregate: NonArgAggregateOp) => {
    if (encoding) {
      specActions.setEncodingAggregate(encoding.unit, encoding.property, aggregate);
    } else {
      specActions.setFieldAggregate(field.name, aggregate);
    }
  };

  const setBin = (bin: boolean) => {
    if (encoding) {
      specActions.setEncodingBin(encoding.unit, encoding.property, bin);
    } else {
      specActions.setFieldBin(field.name, bin);
    }
  };

  const setTimeUnit = (timeUnit: TimeUnit) => {
    if (encoding) {
      specActions.setEncodingTimeUnit(encoding.unit, encoding.property, timeUnit);
    } else {
      specActions.setFieldTimeUnit(field.name, timeUnit);
    }
  };

  const encodingDef = (): EncodingFieldDef | undefined => {
    if (encoding) {
      if (visualPropNames.includes(encoding.property as VisualPropName)) {
        return spec.visual.units.find((unit) => unit.name === encoding.unit)?.encoding[encoding.property];
      } else if (audioPropNames.includes(encoding.property as AudioPropName)) {
        return spec.audio.units.find((unit) => unit.name === encoding.unit)?.encoding[encoding.property];
      }
    }
    return undefined;
  };

  const AggregateFieldOptions = () => {
    if (canAggregateField(spec.key, field)) {
      return (
        <div>
          <label>
            Aggregate
            <select aria-describedby={fieldLabelId} value={encodingDef()?.aggregate ?? field.aggregate} onChange={(e) => setAggregate(e.target.value as NonArgAggregateOp)}>
              <option value="undefined">None</option>
              {aggregateOps.map((aggregateOp) => {
                return <option value={aggregateOp}>{aggregateOp}</option>;
              })}
            </select>
          </label>
        </div>
      );
    }
  };

  const BinFieldOptions = () => {
    if (canBinField(field)) {
      return (
        <div>
          <label>
            Bin
            <input aria-describedby={fieldLabelId} type="checkbox" checked={encodingDef()?.bin ?? field.bin} onChange={(e) => setBin(e.target.checked)} />
          </label>
        </div>
      );
    }
  };

  const TimeUnitFieldOptions = () => {
    if (canTimeUnitField(field)) {
      return (
        <div>
          <label>
            Time unit
            <select aria-describedby={fieldLabelId} value={encodingDef()?.timeUnit ?? field.timeUnit} onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}>
              <option value="undefined">None</option>
              {timeUnits.map((timeUnit) => {
                return <option value={timeUnit}>{timeUnit}</option>;
              })}
            </select>
          </label>
        </div>
      );
    }
  };

  if (canAggregateField(spec.key, field) || canBinField(field) || canTimeUnitField(field)) {
    return (
      <>
        <AggregateFieldOptions />
        <BinFieldOptions />
        <TimeUnitFieldOptions />
      </>
    );
  }

  return null;
}
