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

export function EncodingDefinition({ unit, property, encoding }: EncodingDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      <h5>{property}</h5>
      <div>
        <select
          value={encoding.field}
          onChange={(e) => {
            specActions.removeEncoding(encoding.field, property, unit);
            specActions.addEncoding(e.currentTarget.value, property, unit);
          }}
        >
          <For each={spec.fields.filter((f) => f.active)}>
            {(field) => (
              <option value={field.name} selected={encoding.field === field.name}>
                {field.name}
              </option>
            )}
          </For>
        </select>
        <button
          onClick={() => {
            specActions.removeEncoding(encoding.field, property, unit);
          }}
        >
          Remove encoding
        </button>
        <FieldTransforms fieldName={encoding.field} encoding={{ unit, property }} />
      </div>
    </div>
  );
}
