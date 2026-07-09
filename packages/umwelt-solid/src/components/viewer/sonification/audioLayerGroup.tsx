import { For, createMemo } from 'solid-js';
import { AudioUnitSpec, UmweltDataset, UmweltSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';
import { AudioLayerGroupProvider } from '../../../contexts/sonification/AudioLayerGroupContext';
import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { AudioUnitPlaybackControl } from './audioUnitPlaybackControl';
import { EnumeratedItem } from '../../ui/styled';

export type AudioLayerGroupProps = {
  spec: UmweltSpec;
  data: UmweltDataset;
  units: AudioUnitSpec[];
};

// Synthetic name for the single layered playback entity (there is only ever one
// layer group per sonification).
export const LAYER_GROUP_NAME = 'layer-group';

function AudioLayerGroupDescription() {
  const [_, audioUnitStateActions] = useAudioUnitState();
  return (
    <p>
      {audioUnitStateActions.describeEncodings()}
      <br />
      playing {audioUnitStateActions.describePlaybackOrder()}
    </p>
  );
}

export function AudioLayerGroup(props: AudioLayerGroupProps) {
  // memo, not a plain function: the provider reschedules the transport when the
  // units array's identity changes, so it must be stable across unrelated
  // reactive updates (a fresh .filter() array on every read defeats that guard)
  const activeUnits = createMemo(() => props.units.filter((u) => Object.keys(u.encoding).length > 0));

  if (activeUnits().length === 0) {
    return null;
  }

  const sharedTraversal = () => activeUnits()[0].traversal;

  return (
    <EnumeratedItem>
      <AudioLayerGroupProvider spec={props.spec} data={props.data} units={activeUnits()} groupName={LAYER_GROUP_NAME}>
        <AudioLayerGroupDescription />
        <For each={sharedTraversal()}>{(traversalFieldDef) => <TraversalFieldControl spec={props.spec} traversalFieldDef={traversalFieldDef} />}</For>
        <AudioUnitPlaybackControl unitName={LAYER_GROUP_NAME} />
      </AudioLayerGroupProvider>
    </EnumeratedItem>
  );
}
