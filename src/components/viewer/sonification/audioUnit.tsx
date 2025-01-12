import { For } from 'solid-js';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnitSpec } from '../../../types';
import { TraversalFieldControl } from './traversalFieldControl';
import { AudioUnitStateProvider } from '../../../contexts/sonification/AudioUnitStateContext';
import { AudioScalesProvider } from '../../../contexts/sonification/AudioScalesContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { AudioUnitPlaybackControl } from './audioUnitPlaybackControl';

export type AudioUnitProps = {
  audioUnitSpec: AudioUnitSpec;
};

export function AudioUnit({ audioUnitSpec }: AudioUnitProps) {
  return (
    <AudioScalesProvider encoding={audioUnitSpec.encoding}>
      <AudioUnitStateProvider audioUnitSpec={audioUnitSpec}>
        <For each={audioUnitSpec.traversal}>{(traversalFieldDef) => <TraversalFieldControl traversalFieldDef={traversalFieldDef} />}</For>
        <AudioUnitPlaybackControl />
      </AudioUnitStateProvider>
    </AudioScalesProvider>
  );
}
