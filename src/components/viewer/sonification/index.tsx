import { For } from 'solid-js';
import { SonificationStateProvider } from '../../../contexts/sonification/SonificationStateContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnit } from './audioUnit';
import { AudioEngineProvider } from '../../../contexts/sonification/AudioEngineContext';

export type SonificationProps = {};

export function Sonification(props: SonificationProps) {
  const [spec] = useUmweltSpec();

  return (
    <SonificationStateProvider>
      <AudioEngineProvider>
        <For each={spec.audio.units}>{(audioUnitSpec) => <AudioUnit audioUnitSpec={audioUnitSpec} />}</For>
      </AudioEngineProvider>
    </SonificationStateProvider>
  );
}
