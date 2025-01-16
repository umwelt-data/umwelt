import { For } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { EncodingFieldDef, EncodingPropName, audioPropNames, visualPropNames } from '../../types';
import { describeField } from '../../util/description';
import { FieldTransforms } from './fieldTransforms';

export type EncodingDefinitionProps = {
  unit: string;
  property: EncodingPropName;
  encoding: EncodingFieldDef;
};

export function EncodingDefinition(props: EncodingDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      <h5>{props.property}</h5>
      <div>
        <select
          value={props.encoding.field}
          onChange={(e) => {
            specActions.removeEncoding(props.encoding.field, props.property, props.unit);
            specActions.addEncoding(e.currentTarget.value, props.property, props.unit);
          }}
        >
          <For each={spec.fields.filter((f) => f.active)}>
            {(field) => (
              <option value={field.name} selected={props.encoding.field === field.name}>
                {field.name}
              </option>
            )}
          </For>
        </select>
        <button
          onClick={() => {
            specActions.removeEncoding(props.encoding.field, props.property, props.unit);
          }}
        >
          Remove encoding
        </button>
        <FieldTransforms fieldName={props.encoding.field} encoding={{ unit: props.unit, property: props.property }} />
      </div>
    </div>
  );
}
