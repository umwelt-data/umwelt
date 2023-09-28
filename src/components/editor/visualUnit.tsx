import { createSignal } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnitSpec, markTypes } from '../../types';
import { EncodingDefinition } from './encodingDefinition';

export type VisualUnitProps = {
  unitSpec: VisualUnitSpec;
};

export function VisualUnit(props: VisualUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <div>
      <h3 id={`unit-${props.unitSpec.name}`}>{props.unitSpec.name}</h3>
      <div>
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
        {Object.entries(props.unitSpec.encoding).map(([propName, encoding]) => {
          if (encoding) {
            return <EncodingDefinition property={propName} encoding={encoding} />;
          }
        })}
      </div>
      {spec.visual.units.length > 1 ? <button onClick={() => specActions.removeVisualUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
