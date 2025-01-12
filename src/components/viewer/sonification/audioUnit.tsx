import { For } from 'solid-js';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnitSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';
import { AudioUnitStateProvider } from '../../../contexts/sonification/AudioUnitStateContext';

export type AudioUnitProps = {
  audioUnitSpec: AudioUnitSpec;
};

export function AudioUnit({ audioUnitSpec }: AudioUnitProps) {
  const [spec, specActions] = useUmweltSpec();
  const [runtime, runtimeActions] = useSonificationState();

  return (
    <AudioUnitStateProvider audioUnitSpec={audioUnitSpec}>
      <For each={audioUnitSpec.traversal}>{(traversalFieldDef) => <TraversalFieldControl traversalFieldDef={traversalFieldDef} />}</For>
    </AudioUnitStateProvider>
  );
}
