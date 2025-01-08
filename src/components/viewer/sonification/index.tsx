import { For } from 'solid-js';
import { SonificationRuntimeProvider } from '../../../contexts/SonificationRuntimeContext';
import { useUmweltSpec } from '../../../contexts/UmweltSpecContext';
import { AudioUnit } from './audioUnit';

export type SonificationProps = {};

export function Sonification(props: SonificationProps) {
  const [spec, specActions] = useUmweltSpec();

  return (
    <SonificationRuntimeProvider>
      <For each={spec.audio.units}>{(audioUnitSpec) => <AudioUnit audioUnitSpec={audioUnitSpec} />}</For>
    </SonificationRuntimeProvider>
  );
}
