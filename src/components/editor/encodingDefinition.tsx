import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { EncodingFieldDef, EncodingPropName } from '../../types';

export type EncodingDefinitionProps = {
  property: EncodingPropName;
  encoding: EncodingFieldDef;
};

export function EncodingDefinition(props: EncodingDefinitionProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      <h4>{props.encoding.field}</h4>
      <div>{JSON.stringify(props)}</div>
    </div>
  );
}
