import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioTraversalFieldDef } from '../../types';
import { FieldTransforms } from './fieldTransforms';

export type TraversalDefinitionProps = {
  unit: string;
  traversal: AudioTraversalFieldDef;
};

export function TraversalDefinition(props: TraversalDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      {/* <h5>{props.traversal.field}</h5> */}
      <div>
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
        <FieldTransforms fieldName={props.traversal.field} traversal={{ unit: props.unit }} />
      </div>
    </div>
  );
}
