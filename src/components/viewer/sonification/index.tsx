import { For } from 'solid-js';
import { SonificationStateProvider } from '../../../contexts/sonification/SonificationStateContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnit } from './audioUnit';
import { AudioEngineProvider } from '../../../contexts/sonification/AudioEngineContext';
import { AudioEngineControl } from './audioEngineControl';
import { UmweltSpec } from '../../../types';

export type SonificationProps = {
  spec: UmweltSpec;
};

export function Sonification(props: SonificationProps) {
  return (
    <SonificationStateProvider>
      <AudioEngineProvider>
        <For each={props.spec.audio.units}>{(audioUnitSpec) => <AudioUnit spec={props.spec} audioUnitSpec={audioUnitSpec} />}</For>
        <AudioEngineControl />
      </AudioEngineProvider>
    </SonificationStateProvider>
  );
}
