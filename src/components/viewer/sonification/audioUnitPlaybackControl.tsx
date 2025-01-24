import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { Show } from 'solid-js';

export type AudioUnitPlaybackControlProps = {};

export function AudioUnitPlaybackControl(props: AudioUnitPlaybackControlProps) {
  const [_, audioUnitStateActions] = useAudioUnitState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  function play() {
    audioEngineActions.startAudioContext();
    audioUnitStateActions.setupTransportSequence();
    audioUnitStateActions.resetTraversalIfEnd();
    audioEngineActions.startTransport();
  }

  return (
    <div>
      <Show when={audioEngine.isPlaying} fallback={<button onClick={() => play()}>Play</button>}>
        <button onClick={() => audioEngineActions.stopTransport()}>Pause</button>
      </Show>
    </div>
  );
}
