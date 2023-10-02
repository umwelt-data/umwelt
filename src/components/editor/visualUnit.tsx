import { createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnitSpec, markTypes, visualPropNames } from '../../types';
import { EncodingDefinition } from './encodingDefinition';

export type VisualUnitProps = {
  unitSpec: VisualUnitSpec;
};

export function VisualUnit(props: VisualUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  const assignablePropertyNames = () => {
    return visualPropNames.filter((propName) => !Object.keys(props.unitSpec.encoding).includes(propName));
  };

  const addEncoding = (unitName: string) => {
    const validPropNames = assignablePropertyNames();
    const activeFields = spec.fields.filter((f) => f.active);
    if (validPropNames.length && activeFields.length) {
      const propName = validPropNames[0];
      let fieldName: string;
      if (['y', 'opacity', 'size'].includes(propName)) {
        fieldName = activeFields.find((f) => f.type === 'quantitative')?.name || activeFields[0].name;
      } else if (['x', 'order'].includes(propName)) {
        fieldName = activeFields.find((f) => f.type === 'temporal')?.name || activeFields.find((f) => f.type === 'quantitative')?.name || activeFields[0].name;
      } else if (['color', 'shape', 'facet'].includes(propName)) {
        fieldName = activeFields.find((f) => f.type === 'nominal')?.name || activeFields.find((f) => f.type === 'ordinal')?.name || activeFields[0].name;
      } else {
        fieldName = activeFields[0].name;
      }

      specActions.addEncoding(fieldName, propName, unitName);
    }
  };

  return (
    <div>
      {spec.visual.units.length > 1 ? (
        <div>
          <h3 id={`unit-${props.unitSpec.name}`}>{props.unitSpec.name}</h3>
          <label>
            Unit name
            <input
              value={props.unitSpec.name}
              onChange={(e) => {
                specActions.renameUnit(props.unitSpec.name, e.currentTarget.value);
              }}
            ></input>
          </label>
        </div>
      ) : null}
      <div>
        <label>
          Mark
          <select>
            {markTypes.map((markType) => {
              return <option value={markType}>{markType}</option>;
            })}
          </select>
        </label>
      </div>
      <div>
        Encodings
        {Object.keys(props.unitSpec.encoding).length < visualPropNames.length ? (
          <button aria-describedby={`unit-${props.unitSpec.name}`} onClick={() => addEncoding(props.unitSpec.name)}>
            Add encoding
          </button>
        ) : null}
        <button></button>
        <div>
          {Object.entries(props.unitSpec.encoding).map(([propName, encoding]) => {
            if (encoding) {
              return <EncodingDefinition property={propName} encoding={encoding} />;
            }
          })}
        </div>
      </div>
      {spec.visual.units.length > 1 ? <button onClick={() => specActions.removeVisualUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
