import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import type { TextTarget } from '../../contexts/UmweltSpecContext';
import { aggregateOps, EncodingFieldDef, EncodingRef, FieldDef, FieldName, MeasureType, TextFieldRef, isAudioProp, isVisualProp, NONE, timeUnits, UmweltAggregateOp, UmweltTimeUnit } from '../../types';
import { getFieldDef } from '../../util/spec';
import { For, Show } from 'solid-js';
import { InputRow } from '../ui/styled';

const MEASURE_TYPES: MeasureType[] = ['nominal', 'ordinal', 'quantitative', 'temporal'];

interface FieldTransformsProps {
  fieldName: string;
  encoding?: EncodingRef;
  traversal?: { unit: string };
  // a text group-node field ref; carries its own current transform values
  textNode?: { target: TextTarget; nodeId: string; index: number; ref: TextFieldRef };
  fieldLabelId?: string;
}

interface TransformActions {
  setType?: (value: MeasureType | 'undefined') => void;
  setAggregate?: (value: UmweltAggregateOp | 'undefined') => void;
  setBin: (value: boolean) => void;
  setTimeUnit: (value: UmweltTimeUnit | 'undefined') => void;
}

// Shared "Additional options" for a field usage: measure-type override (per-channel
// / per-node), aggregate, bin, and time unit. Used by visual encodings, audio
// traversals, field definitions, and text group nodes.
export function FieldTransforms(props: FieldTransformsProps) {
  const [spec, specActions] = useUmweltSpec();

  function getTransformActions(): TransformActions {
    if (props.textNode) {
      const { target, nodeId, index } = props.textNode;
      return {
        setType: (value) => specActions.setTextNodeType(target, nodeId, index, value),
        setBin: (value) => specActions.setTextNodeBin(target, nodeId, index, value),
        setTimeUnit: (value) => specActions.setTextNodeTimeUnit(target, nodeId, index, value),
      };
    }
    if (props.encoding) {
      const { unit, property } = props.encoding;
      return {
        setType: (value) => specActions.setEncodingType(unit, property, value),
        setAggregate: (value) => specActions.setEncodingAggregate(unit, property, value),
        setBin: (value) => specActions.setEncodingBin(unit, property, value),
        setTimeUnit: (value) => specActions.setEncodingTimeUnit(unit, property, value),
      };
    }
    if (props.traversal) {
      return {
        setType: (value) => specActions.setTraversalType(props.traversal!.unit, props.fieldName, value),
        setBin: (value) => specActions.setTraversalBin(props.traversal!.unit, props.fieldName, value),
        setTimeUnit: (value) => specActions.setTraversalTimeUnit(props.traversal!.unit, props.fieldName, value),
      };
    }
    return {
      setAggregate: (value) => specActions.setFieldAggregate(props.fieldName, value),
      setBin: (value) => specActions.setFieldBin(props.fieldName, value),
      setTimeUnit: (value) => specActions.setFieldTimeUnit(props.fieldName, value),
    };
  }

  const actions = getTransformActions();
  const isOverride = () => !!(props.encoding || props.textNode); // shows an "Inherit (…)" option
  const fieldDef = () => getFieldDef(spec, props.fieldName);

  const canTypeField = (field?: FieldDef) => !!field && !!actions.setType;
  const canAggregateField = (key: FieldName[], field?: FieldDef) => {
    if (!field) return false;
    if (props.traversal || props.textNode) return false;
    return !key.includes(field.name) && field.type === 'quantitative';
  };
  const canBinField = (field?: FieldDef) => {
    if (!field) return false;
    if (props.encoding && isAudioProp(props.encoding.property)) return false;
    return field.type === 'quantitative' || field.type === 'temporal';
  };
  const canTimeUnitField = (field?: FieldDef) => !!field && field.type === 'temporal';

  // The current per-usage transform values (encoding def, traversal def, or text ref).
  const usageDef = (): { type?: MeasureType; aggregate?: UmweltAggregateOp | typeof NONE; bin?: boolean; timeUnit?: UmweltTimeUnit | typeof NONE } | undefined => {
    if (props.textNode) return props.textNode.ref;
    if (props.encoding) {
      if (isVisualProp(props.encoding.property)) return spec.visual.units.find((u) => u.name === props.encoding?.unit)?.encoding[props.encoding.property];
      if (isAudioProp(props.encoding.property)) return spec.audio.units.find((u) => u.name === props.encoding?.unit)?.encoding[props.encoding.property] as EncodingFieldDef;
    }
    if (props.traversal) return spec.audio.units.find((u) => u.name === props.traversal?.unit)?.traversal.find((t) => t.field === props.fieldName);
    return undefined;
  };

  const TypeInput = () => (
    <Show when={canTypeField(fieldDef())}>
      <InputRow>
        <label>
          Type
          <select aria-describedby={props.fieldLabelId} value={(usageDef()?.type as string) ?? 'undefined'} onChange={(e) => actions.setType?.(e.currentTarget.value === 'undefined' ? 'undefined' : (e.currentTarget.value as MeasureType))}>
            <option value="undefined">Inherit ({fieldDef()?.type ?? 'nominal'})</option>
            <For each={MEASURE_TYPES}>{(t) => <option value={t}>{t}</option>}</For>
          </select>
        </label>
      </InputRow>
    </Show>
  );

  const AggregateInput = () => (
    <Show when={canAggregateField(spec.key, fieldDef())}>
      <InputRow>
        <label>
          Aggregate
          <select aria-describedby={props.fieldLabelId} value={isOverride() ? usageDef()?.aggregate : fieldDef()?.aggregate ?? NONE} onChange={(e) => actions.setAggregate?.(e.target.value as UmweltAggregateOp)}>
            <Show when={isOverride()}>
              <option value={undefined}>Inherit ({fieldDef()?.aggregate ?? NONE})</option>
            </Show>
            <option value={NONE}>None</option>
            <For each={aggregateOps}>{(aggregateOp) => <option value={aggregateOp}>{aggregateOp}</option>}</For>
          </select>
        </label>
      </InputRow>
    </Show>
  );

  const BinInput = () => (
    <Show when={canBinField(fieldDef())}>
      <InputRow>
        <label>
          Bin
          <input aria-describedby={props.fieldLabelId} type="checkbox" checked={usageDef()?.bin ?? fieldDef()?.bin} onChange={(e) => actions.setBin(e.target.checked)} />
        </label>
      </InputRow>
    </Show>
  );

  const TimeUnitInput = () => (
    <Show when={canTimeUnitField(fieldDef())}>
      <InputRow>
        <label>
          Time unit
          <select aria-describedby={props.fieldLabelId} value={isOverride() ? usageDef()?.timeUnit : fieldDef()?.timeUnit ?? NONE} onChange={(e) => actions.setTimeUnit(e.target.value as UmweltTimeUnit)}>
            <Show when={isOverride()}>
              <option value={undefined}>Inherit ({fieldDef()?.timeUnit ?? NONE})</option>
            </Show>
            <option value={NONE}>None</option>
            <For each={timeUnits}>{(timeUnit) => <option value={timeUnit}>{timeUnit}</option>}</For>
          </select>
        </label>
      </InputRow>
    </Show>
  );

  return (
    <Show when={canTypeField(fieldDef()) || canAggregateField(spec.key, fieldDef()) || canBinField(fieldDef()) || canTimeUnitField(fieldDef())}>
      <details>
        <summary>Additional options</summary>
        <TypeInput />
        <AggregateInput />
        <BinInput />
        <TimeUnitInput />
      </details>
    </Show>
  );
}
