import { For, Show } from 'solid-js';
import { SonificationStateProvider } from '../../../contexts/sonification/SonificationStateContext';
import { AudioUnit } from './audioUnit';
import { AudioLayerGroup } from './audioLayerGroup';
import { AudioEngineProvider } from '../../../contexts/sonification/AudioEngineContext';
import { AudioEngineControl } from './audioEngineControl';
import { SonificationKeyHandlers } from './sonificationKeyHandlers';
import { UmweltDataset, UmweltSpec } from '../../../types';

export type SonificationProps = {
  spec: UmweltSpec;
  data: UmweltDataset;
  /** Element to scope keyboard shortcuts to (this viewer's root); see SonificationKeyHandlers. */
  keyEventTarget?: () => HTMLElement | null | undefined;
};

export function Sonification(props: SonificationProps) {
  // Layer composition plays all units simultaneously under one shared traversal;
  // concat (and the single-unit case) keeps independent mutually-exclusive tracks.
  const isLayered = () => props.spec.audio.composition === 'layer' && props.spec.audio.units.length > 1;

  return (
    <SonificationStateProvider>
      <AudioEngineProvider>
        <SonificationKeyHandlers target={props.keyEventTarget} />
        <Show when={isLayered()} fallback={<For each={props.spec.audio.units}>{(audioUnitSpec) => <AudioUnit spec={props.spec} data={props.data} audioUnitSpec={audioUnitSpec} />}</For>}>
          <AudioLayerGroup spec={props.spec} data={props.data} units={props.spec.audio.units} />
        </Show>
        <AudioEngineControl />
      </AudioEngineProvider>
    </SonificationStateProvider>
  );
}
