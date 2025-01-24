import { For } from 'solid-js';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnitSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';
import { AudioUnitStateProvider } from '../../../contexts/sonification/AudioUnitStateContext';
import { AudioScalesProvider } from '../../../contexts/sonification/AudioScalesContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { AudioUnitPlaybackControl } from './audioUnitPlaybackControl';
import { describeField } from '../../../util/description';
import { getFieldDef, resolveFieldDef } from '../../../util/spec';

export type AudioUnitProps = {
  audioUnitSpec: AudioUnitSpec;
};

export function AudioUnit(props: AudioUnitProps) {
  const [spec] = useUmweltSpec();

  return (
    <AudioScalesProvider encoding={props.audioUnitSpec.encoding}>
      <AudioUnitStateProvider audioUnitSpec={props.audioUnitSpec}>
        <For each={props.audioUnitSpec.traversal}>{(traversalFieldDef) => <TraversalFieldControl traversalFieldDef={traversalFieldDef} />}</For>
        {Object.entries(props.audioUnitSpec.encoding).map(([propName, encoding]) => {
          if (encoding) {
            const fieldDef = getFieldDef(spec, encoding.field);
            if (fieldDef) {
              const resolvedFieldDef = resolveFieldDef(fieldDef, encoding);
              return `${propName}: ${describeField(resolvedFieldDef)}`;
            }
          }
        })}
        <AudioUnitPlaybackControl unitName={props.audioUnitSpec.name} />
      </AudioUnitStateProvider>
    </AudioScalesProvider>
  );
}
