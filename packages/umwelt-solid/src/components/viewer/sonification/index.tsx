import { For } from 'solid-js';
import { SonificationStateProvider } from '../../../contexts/sonification/SonificationStateContext';
import { AudioUnit } from './audioUnit';
import { AudioEngineProvider } from '../../../contexts/sonification/AudioEngineContext';
import { AudioEngineControl } from './audioEngineControl';
import { UmweltDataset, UmweltSpec } from '../../../types';

export type SonificationProps = {
  spec: UmweltSpec;
  data: UmweltDataset;
};

export function Sonification(props: SonificationProps) {
  return (
    <SonificationStateProvider>
      <AudioEngineProvider>
        <For each={props.spec.audio.units}>{(audioUnitSpec) => <AudioUnit spec={props.spec} data={props.data} audioUnitSpec={audioUnitSpec} />}</For>
        <AudioEngineControl />
      </AudioEngineProvider>
    </SonificationStateProvider>
  );
}
