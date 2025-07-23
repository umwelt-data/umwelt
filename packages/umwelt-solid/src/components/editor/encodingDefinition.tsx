import { For } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { EncodingFieldDef, EncodingPropName } from '../../types';
import { FieldTransforms } from './fieldTransforms';
import { styled } from 'solid-styled-components';
import { EncodingContainer, EncodingColumn, EncodingRow } from '../ui/styled';

export type EncodingDefinitionProps = {
  unit: string;
  property: EncodingPropName;
  encoding: EncodingFieldDef;
};


export function EncodingDefinition(props: EncodingDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <EncodingContainer>
      <h5>{props.property}</h5>
      <EncodingColumn>
        <EncodingRow>
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
        </EncodingRow>
        <FieldTransforms fieldName={props.encoding.field} encoding={{ unit: props.unit, property: props.property }} />
      </EncodingColumn>
    </EncodingContainer>
  );
}
