import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioPropName, audioPropNames, EncodingFieldDef, EncodingRef, FieldDef, FieldName, NONE, VisualPropName, visualPropNames } from '../../types';
import { TimeUnit } from 'vega';
import { getFieldDef } from '../../util/spec';
import { For, Show } from 'solid-js';

interface FieldTransformsProps {
  fieldName: string;
  encoding?: EncodingRef;
  fieldLabelId?: string;
}

const aggregateOps: NonArgAggregateOp[] = ['mean', 'median', 'min', 'max', 'sum', 'count'];
const timeUnits = ['year', 'month', 'yearmonth', 'day', 'date', 'hours', 'minutes', 'seconds'];

export function FieldTransforms({ fieldName, encoding, fieldLabelId }: FieldTransformsProps) {
  const [spec, specActions] = useUmweltSpec();

  const canAggregateField = (key: FieldName[], field?: FieldDef) => {
    if (!field) return false;
    return !key.includes(field.name) && field.type === 'quantitative';
  };
  const canBinField = (field?: FieldDef) => {
    if (!field) return false;
    return field.type === 'quantitative' || field.type === 'temporal';
  };
  const canTimeUnitField = (field?: FieldDef) => {
    if (!field) return false;
    return field.type === 'temporal';
  };

  const setAggregate = (aggregate: NonArgAggregateOp) => {
    if (encoding) {
      specActions.setEncodingAggregate(encoding.unit, encoding.property, aggregate);
    } else {
      specActions.setFieldAggregate(fieldName, aggregate);
    }
  };

  const setBin = (bin: boolean) => {
    if (encoding) {
      specActions.setEncodingBin(encoding.unit, encoding.property, bin);
    } else {
      specActions.setFieldBin(fieldName, bin);
    }
  };

  const setTimeUnit = (timeUnit: TimeUnit) => {
    if (encoding) {
      specActions.setEncodingTimeUnit(encoding.unit, encoding.property, timeUnit);
    } else {
      specActions.setFieldTimeUnit(fieldName, timeUnit);
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

  const fieldDef = () => getFieldDef(spec, fieldName);

  const AggregateInput = () => {
    return (
      <Show when={canAggregateField(spec.key, fieldDef())}>
        <div>
          <label>
            Aggregate
            <select aria-describedby={fieldLabelId} value={encoding ? encodingDef()?.aggregate : fieldDef()?.aggregate ?? NONE} onChange={(e) => setAggregate(e.target.value as NonArgAggregateOp)}>
              <Show when={encoding}>
                <option value={undefined}>Inherit ({fieldDef()?.aggregate ?? NONE})</option>
              </Show>
              <option value={NONE}>None</option>
              <For each={aggregateOps}>{(aggregateOp) => <option value={aggregateOp}>{aggregateOp}</option>}</For>
            </select>
          </label>
        </div>
      </Show>
    );
  };

  const BinInput = () => {
    return (
      <Show when={canBinField(fieldDef())}>
        <div>
          <label>
            Bin
            <input aria-describedby={fieldLabelId} type="checkbox" checked={encodingDef()?.bin ?? fieldDef()?.bin} onChange={(e) => setBin(e.target.checked)} />
          </label>
        </div>
      </Show>
    );
  };

  const TimeUnitInput = () => {
    return (
      <Show when={canTimeUnitField(fieldDef())}>
        <div>
          <label>
            Time unit
            <select aria-describedby={fieldLabelId} value={encoding ? encodingDef()?.timeUnit : fieldDef()?.timeUnit ?? NONE} onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}>
              <Show when={encoding}>
                <option value={undefined}>Inherit ({fieldDef()?.timeUnit ?? NONE})</option>
              </Show>
              <option value={NONE}>None</option>
              <For each={timeUnits}>{(timeUnit) => <option value={timeUnit}>{timeUnit}</option>}</For>
            </select>
          </label>
        </div>
      </Show>
    );
  };

  return (
    <>
      <AggregateInput />
      <BinInput />
      <TimeUnitInput />
    </>
  );
}
