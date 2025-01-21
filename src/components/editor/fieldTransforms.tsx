import { NonArgAggregateOp } from 'vega-lite/src/aggregate';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { aggregateOps, AudioPropName, audioPropNames, EncodingFieldDef, EncodingRef, FieldDef, FieldName, NONE, timeUnits, VisualPropName, visualPropNames } from '../../types';
import { TimeUnit } from 'vega';
import { getFieldDef } from '../../util/spec';
import { For, Show } from 'solid-js';

interface FieldTransformsProps {
  fieldName: string;
  encoding?: EncodingRef;
  fieldLabelId?: string;
}

export function FieldTransforms(props: FieldTransformsProps) {
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
    if (props.encoding) {
      specActions.setEncodingAggregate(props.encoding.unit, props.encoding.property, aggregate);
    } else {
      specActions.setFieldAggregate(props.fieldName, aggregate);
    }
  };

  const setBin = (bin: boolean) => {
    if (props.encoding) {
      specActions.setEncodingBin(props.encoding.unit, props.encoding.property, bin);
    } else {
      specActions.setFieldBin(props.fieldName, bin);
    }
  };

  const setTimeUnit = (timeUnit: TimeUnit) => {
    if (props.encoding) {
      specActions.setEncodingTimeUnit(props.encoding.unit, props.encoding.property, timeUnit);
    } else {
      specActions.setFieldTimeUnit(props.fieldName, timeUnit);
    }
  };

  const encodingDef = (): EncodingFieldDef | undefined => {
    if (props.encoding) {
      if (visualPropNames.includes(props.encoding.property as VisualPropName)) {
        return spec.visual.units.find((unit) => unit.name === props.encoding?.unit)?.encoding[props.encoding.property];
      } else if (audioPropNames.includes(props.encoding.property as AudioPropName)) {
        return spec.audio.units.find((unit) => unit.name === props.encoding?.unit)?.encoding[props.encoding.property];
      }
    }
    return undefined;
  };

  const fieldDef = () => getFieldDef(spec, props.fieldName);

  const AggregateInput = () => {
    return (
      <Show when={canAggregateField(spec.key, fieldDef())}>
        <div>
          <label>
            Aggregate
            <select aria-describedby={props.fieldLabelId} value={props.encoding ? encodingDef()?.aggregate : fieldDef()?.aggregate ?? NONE} onChange={(e) => setAggregate(e.target.value as NonArgAggregateOp)}>
              <Show when={props.encoding}>
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
            <input aria-describedby={props.fieldLabelId} type="checkbox" checked={encodingDef()?.bin ?? fieldDef()?.bin} onChange={(e) => setBin(e.target.checked)} />
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
            <select aria-describedby={props.fieldLabelId} value={props.encoding ? encodingDef()?.timeUnit : fieldDef()?.timeUnit ?? NONE} onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}>
              <Show when={props.encoding}>
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
