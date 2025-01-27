import { For } from 'solid-js';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnitSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';
import { AudioUnitStateProvider, useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { AudioScalesProvider } from '../../../contexts/sonification/AudioScalesContext';
import { AudioUnitPlaybackControl } from './audioUnitPlaybackControl';
import { describeField } from '../../../util/description';
import { getFieldDef, resolveFieldDef } from '../../../util/spec';

export type AudioUnitProps = {
  audioUnitSpec: AudioUnitSpec;
};

export function AudioUnit(props: AudioUnitProps) {
  const [spec] = useUmweltSpec();

  function AudioUnitEncodings() {
    return Object.entries(props.audioUnitSpec.encoding).map(([propName, encoding]) => {
      if (encoding) {
        const fieldDef = getFieldDef(spec, encoding.field);
        if (fieldDef) {
          const resolvedFieldDef = resolveFieldDef(fieldDef, encoding);
          return <div>{`${propName}: ${describeField(resolvedFieldDef)}`}</div>;
        }
      }
    });
  }

  function AudioUnitDescription() {
    const [_, audioUnitStateActions] = useAudioUnitState();

    return (
      <p>
        {audioUnitStateActions.describeEncodings()}, playing {audioUnitStateActions.describePlaybackOrder()}
      </p>
    );
  }

  return (
    <AudioScalesProvider encoding={props.audioUnitSpec.encoding}>
      <AudioUnitStateProvider audioUnitSpec={props.audioUnitSpec}>
        <AudioUnitDescription />
        <AudioUnitEncodings />
        <For each={props.audioUnitSpec.traversal}>{(traversalFieldDef) => <TraversalFieldControl traversalFieldDef={traversalFieldDef} />}</For>
        <AudioUnitPlaybackControl unitName={props.audioUnitSpec.name} />
      </AudioUnitStateProvider>
    </AudioScalesProvider>
  );
}
