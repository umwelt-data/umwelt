import { Mark } from 'vega-lite/src/mark';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { VisualUnitSpec, markTypes, visualPropNames } from '../../types';
import { EncodingDefinition } from './encodingDefinition';

export type VisualUnitProps = {
  unitSpec: VisualUnitSpec;
};

export function VisualUnit(props: VisualUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  const getEncodings = () => {
    return Object.entries(props.unitSpec.encoding).sort((a, b) => {
      const aIndex = visualPropNames.indexOf(a[0]);
      const bIndex = visualPropNames.indexOf(b[0]);
      return aIndex - bIndex;
    });
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
          <select
            value={props.unitSpec.mark}
            onChange={(e) => {
              specActions.changeMark(props.unitSpec.name, e.currentTarget.value as Mark);
            }}
          >
            {markTypes.map((markType) => {
              return (
                <option value={markType} selected={markType === props.unitSpec.mark}>
                  {markType}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <div>
        <h4>Encodings</h4>
        <div>
          {getEncodings().map(([propName, encoding]) => {
            if (encoding) {
              return <EncodingDefinition property={propName} encoding={encoding} unit={props.unitSpec.name} />;
            }
          })}
        </div>
      </div>
      {spec.visual.units.length > 1 ? <button onClick={() => specActions.removeVisualUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
