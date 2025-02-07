import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { aggregateOps, EncodingFieldDef, EncodingRef, FieldDef, FieldName, isAudioProp, isVisualProp, NONE, timeUnits, UmweltAggregateOp, UmweltTimeUnit } from '../../types';
import { getFieldDef } from '../../util/spec';
import { For, Show } from 'solid-js';
import { InputRow } from '../ui/styled';

interface FieldTransformsProps {
  fieldName: string;
  encoding?: EncodingRef;
  traversal?: { unit: string };
  fieldLabelId?: string;
}

interface TransformActions {
  setAggregate?: (value: UmweltAggregateOp | 'undefined') => void;
  setBin: (value: boolean) => void;
  setTimeUnit: (value: UmweltTimeUnit | 'undefined') => void;
}

export function FieldTransforms(props: FieldTransformsProps) {
  const [spec, specActions] = useUmweltSpec();

  function getTransformActions(fieldName: string, encoding?: EncodingRef, traversal?: { unit: string }): TransformActions {
    if (encoding) {
      return {
        setAggregate: (value) => specActions.setEncodingAggregate(encoding.unit, encoding.property, value),
        setBin: (value) => specActions.setEncodingBin(encoding.unit, encoding.property, value),
        setTimeUnit: (value) => specActions.setEncodingTimeUnit(encoding.unit, encoding.property, value),
      };
    }

    if (traversal) {
      return {
        setBin: (value) => specActions.setTraversalBin(traversal.unit, fieldName, value),
        setTimeUnit: (value) => specActions.setTraversalTimeUnit(traversal.unit, fieldName, value),
      };
    }

    return {
      setAggregate: (value) => specActions.setFieldAggregate(fieldName, value),
      setBin: (value) => specActions.setFieldBin(fieldName, value),
      setTimeUnit: (value) => specActions.setFieldTimeUnit(fieldName, value),
    };
  }

  const canAggregateField = (key: FieldName[], field?: FieldDef) => {
    if (!field) return false;
    if (props.traversal) return false;
    return !key.includes(field.name) && field.type === 'quantitative';
  };
  const canBinField = (field?: FieldDef) => {
    if (!field) return false;
    if (props.encoding && isAudioProp(props.encoding.property)) return false;
    return field.type === 'quantitative' || field.type === 'temporal';
  };
  const canTimeUnitField = (field?: FieldDef) => {
    if (!field) return false;
    return field.type === 'temporal';
  };

  const actions = getTransformActions(props.fieldName, props.encoding, props.traversal);

  const setAggregate = (aggregate: UmweltAggregateOp) => {
    actions.setAggregate?.(aggregate);
  };

  const setBin = (bin: boolean) => {
    actions.setBin(bin);
  };

  const setTimeUnit = (timeUnit: UmweltTimeUnit) => {
    actions.setTimeUnit(timeUnit);
  };

  const encodingOrTraversalDef = (): EncodingFieldDef | undefined => {
    if (props.encoding) {
      if (isVisualProp(props.encoding.property)) {
        return spec.visual.units.find((unit) => unit.name === props.encoding?.unit)?.encoding[props.encoding.property];
      } else if (isAudioProp(props.encoding.property)) {
        return spec.audio.units.find((unit) => unit.name === props.encoding?.unit)?.encoding[props.encoding.property];
      }
    } else if (props.traversal) {
      return spec.audio.units.find((unit) => unit.name === props.traversal?.unit)?.traversal.find((traversal) => traversal.field === props.fieldName);
    }
    return undefined;
  };

  const fieldDef = () => getFieldDef(spec, props.fieldName);

  const AggregateInput = () => {
    return (
      <Show when={canAggregateField(spec.key, fieldDef())}>
        <InputRow>
          <label>
            Aggregate
            <select aria-describedby={props.fieldLabelId} value={props.encoding ? encodingOrTraversalDef()?.aggregate : fieldDef()?.aggregate ?? NONE} onChange={(e) => setAggregate(e.target.value as UmweltAggregateOp)}>
              <Show when={props.encoding}>
                <option value={undefined}>Inherit ({fieldDef()?.aggregate ?? NONE})</option>
              </Show>
              <option value={NONE}>None</option>
              <For each={aggregateOps}>{(aggregateOp) => <option value={aggregateOp}>{aggregateOp}</option>}</For>
            </select>
          </label>
        </InputRow>
      </Show>
    );
  };

  const BinInput = () => {
    return (
      <Show when={canBinField(fieldDef())}>
        <InputRow>
          <label>
            Bin
            <input aria-describedby={props.fieldLabelId} type="checkbox" checked={encodingOrTraversalDef()?.bin ?? fieldDef()?.bin} onChange={(e) => setBin(e.target.checked)} />
          </label>
        </InputRow>
      </Show>
    );
  };

  const TimeUnitInput = () => {
    return (
      <Show when={canTimeUnitField(fieldDef())}>
        <InputRow>
          <label>
            Time unit
            <select aria-describedby={props.fieldLabelId} value={props.encoding ? encodingOrTraversalDef()?.timeUnit : fieldDef()?.timeUnit ?? NONE} onChange={(e) => setTimeUnit(e.target.value as UmweltTimeUnit)}>
              <Show when={props.encoding}>
                <option value={undefined}>Inherit ({fieldDef()?.timeUnit ?? NONE})</option>
              </Show>
              <option value={NONE}>None</option>
              <For each={timeUnits}>{(timeUnit) => <option value={timeUnit}>{timeUnit}</option>}</For>
            </select>
          </label>
        </InputRow>
      </Show>
    );
  };

  return (
    <Show when={canAggregateField(spec.key, fieldDef()) || canBinField(fieldDef()) || canTimeUnitField(fieldDef())}>
      <details>
        <summary>Additional options</summary>
        <AggregateInput />
        <BinInput />
        <TimeUnitInput />
      </details>
    </Show>
  );
}
