import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioUnitSpec, audioPropNames, markTypes, visualPropNames } from '../../types';
import { EncodingDefinition } from './encodingDefinition';
import { TraversalDefinition } from './traversalDefinition';

export type AudioUnitProps = {
  unitSpec: AudioUnitSpec;
};

export function AudioUnit(props: AudioUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  const getEncodings = () => {
    return Object.entries(props.unitSpec.encoding).sort((a, b) => {
      const aIndex = audioPropNames.indexOf(a[0]);
      const bIndex = audioPropNames.indexOf(b[0]);
      return aIndex - bIndex;
    });
  };

  return (
    <div>
      {spec.audio.units.length > 1 ? (
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
        <h4>Encodings</h4>
        <div>
          {getEncodings().map(([propName, encoding]) => {
            if (encoding) {
              return <EncodingDefinition property={propName} encoding={encoding} unit={props.unitSpec.name} />;
            }
          })}
        </div>
      </div>
      <div>
        <h4>Traversals</h4>
        <div>
          {props.unitSpec.traversal.map((traversal) => {
            return <TraversalDefinition unit={props.unitSpec.name} traversal={traversal} />;
          })}
        </div>
      </div>
      {spec.audio.units.length > 1 ? <button onClick={() => specActions.removeAudioUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
