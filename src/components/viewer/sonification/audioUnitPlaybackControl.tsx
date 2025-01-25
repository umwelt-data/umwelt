import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { Show } from 'solid-js';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';

export type AudioUnitPlaybackControlProps = {
  unitName: string;
};

export function AudioUnitPlaybackControl(props: AudioUnitPlaybackControlProps) {
  const [_, audioUnitStateActions] = useAudioUnitState();
  const [audioEngine, audioEngineActions] = useAudioEngine();
  const [sonificationState] = useSonificationState();

  function play() {
    audioEngineActions.startAudioContext();
    audioUnitStateActions.setupTransportSequence();
    audioUnitStateActions.resetTraversalIfEnd();
    audioEngineActions.startTransport();
  }

  return (
    <div>
      <div>describePlaybackOrder {audioUnitStateActions.describePlaybackOrder()}</div>
      <Show when={audioEngine.isPlaying && sonificationState.activeUnitName === props.unitName} fallback={<button onClick={() => play()}>Play</button>}>
        <button onClick={() => audioEngineActions.stopTransport()}>Pause</button>
      </Show>
    </div>
  );
}
