import { For } from 'solid-js';
import { useSonificationRuntime } from '../../../contexts/SonificationRuntimeContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnitSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';

export type AudioUnitProps = {
  audioUnitSpec: AudioUnitSpec;
};

export function AudioUnit({ audioUnitSpec }: AudioUnitProps) {
  const [spec, specActions] = useUmweltSpec();
  const [runtime, runtimeActions] = useSonificationRuntime();

  return (
    <div>
      <For each={audioUnitSpec.traversal}>{(traversalFieldDef) => <TraversalFieldControl traversalFieldDef={traversalFieldDef} />}</For>
    </div>
  );
}
