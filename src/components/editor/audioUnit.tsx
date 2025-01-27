import { Show } from 'solid-js';
import { useUmweltSpec } from '../../contexts/UmweltSpecContext';
import { AudioPropName, AudioUnitSpec, audioPropNames, isAudioProp, markTypes, visualPropNames } from '../../types';
import { EncodingDefinition } from './encodingDefinition';
import { TraversalDefinition } from './traversalDefinition';
import ReorderableList from '../ui/ReorderableList';

export type AudioUnitProps = {
  unitSpec: AudioUnitSpec;
};

export function AudioUnit(props: AudioUnitProps) {
  const [spec, specActions] = useUmweltSpec();

  const getEncodings = () => {
    return Object.entries(props.unitSpec.encoding).sort((a, b) => {
      if (isAudioProp(a[0]) && isAudioProp(b[0])) {
        const aIndex = audioPropNames.indexOf(a[0]);
        const bIndex = audioPropNames.indexOf(b[0]);
        return aIndex - bIndex;
      }
      return 0;
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
            if (encoding && isAudioProp(propName)) {
              return <EncodingDefinition property={propName} encoding={encoding} unit={props.unitSpec.name} />;
            }
          })}
        </div>
      </div>
      <div>
        <h4>Traversals</h4>
        <div>
          <Show when={props.unitSpec.traversal.length} fallback={'No traversals'}>
            <ReorderableList
              items={props.unitSpec.traversal}
              renderItem={(traversal) => <TraversalDefinition unit={props.unitSpec.name} traversal={traversal} />}
              onReorder={(value, newIndex) => {
                specActions.reorderTraversal(props.unitSpec.name, value.field, newIndex);
              }}
            />
          </Show>
        </div>
      </div>
      {spec.audio.units.length > 1 ? <button onClick={() => specActions.removeAudioUnit(props.unitSpec.name)}>Remove unit</button> : null}
    </div>
  );
}
