import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { Show, createEffect, onMount } from 'solid-js';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';

export type AudioUnitPlaybackControlProps = {
  unitName: string;
};

export function AudioUnitPlaybackControl(props: AudioUnitPlaybackControlProps) {
  const [_, audioUnitStateActions] = useAudioUnitState();
  const [audioEngine, audioEngineActions] = useAudioEngine();
  const [sonificationState, sonificationStateActions] = useSonificationState();

  function play() {
    audioEngineActions.startAudioContext();
    if (sonificationState.activeUnitName !== props.unitName) {
      sonificationStateActions.setActiveUnit(props.unitName);
      audioUnitStateActions.setupTransportSequence();
    }
    audioUnitStateActions.resetTraversalIfEnd();
    audioEngineActions.startTransport();
  }

  // Register this unit's play function so key handlers can invoke it.
  // On mount: register only if no callback is set yet (first unit becomes the default).
  // When this unit becomes active: always overwrite to keep the callback current.
  onMount(() => sonificationStateActions.registerPlayCallback(play));
  createEffect(() => {
    if (sonificationState.activeUnitName === props.unitName) {
      sonificationStateActions.registerPlayCallback(play, true);
    }
  });

  return (
    <div>
      <Show when={audioEngine.isPlaying && sonificationState.activeUnitName === props.unitName} fallback={<button onClick={() => play()}>Play</button>}>
        <button onClick={() => audioEngineActions.stopTransport()}>Pause</button>
      </Show>
    </div>
  );
}
