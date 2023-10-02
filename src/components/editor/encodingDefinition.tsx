import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { EncodingFieldDef, EncodingPropName } from '../../types';

export type EncodingDefinitionProps = {
  unit: string;
  property: EncodingPropName;
  encoding: EncodingFieldDef;
};

export function EncodingDefinition(props: EncodingDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      <h4>{props.property}</h4>
      <div>{JSON.stringify(props)}</div>
      <div>
        <button
          onClick={() => {
            specActions.removeEncoding(props.encoding.field, props.property, props.unit);
          }}
        >
          Remove encoding
        </button>
      </div>
    </div>
  );
}
