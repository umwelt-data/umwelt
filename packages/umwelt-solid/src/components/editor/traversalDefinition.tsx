import { styled } from 'solid-styled-components';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioTraversalFieldDef } from '../../types';
import { FieldTransforms } from './fieldTransforms';

export type TraversalDefinitionProps = {
  unit: string;
  traversal: AudioTraversalFieldDef;
};

const EncodingColumn = styled.div`
  > * {
    margin-bottom: 3px;
  }
`;

const EncodingRow = styled.div`
  display: flex;
  gap: 3px;
`;

export function TraversalDefinition(props: TraversalDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <EncodingColumn>
      {/* <h5>{props.traversal.field}</h5> */}
      <EncodingRow>
        <select value={props.traversal.field} onChange={(e) => {}}>
          {spec.fields
            .filter((f) => f.active)
            .map((field) => {
              return (
                <option value={field.name} selected={props.traversal.field === field.name}>
                  {field.name}
                </option>
              );
            })}
        </select>
        <button onClick={() => {}}>Remove traversal</button>
      </EncodingRow>
      <FieldTransforms fieldName={props.traversal.field} traversal={{ unit: props.unit }} />
    </EncodingColumn>
  );
}
