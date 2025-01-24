import { useAudioUnitState } from '../../../contexts/sonification/AudioUnitStateContext';
import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { Show } from 'solid-js';

export type AudioEngineControlProps = {};

export function AudioEngineControl(props: AudioEngineControlProps) {
  const [audioEngine, audioEngineActions] = useAudioEngine();

  return (
    <div>
      <label>
        <input type="checkbox" aria-live="polite" checked={audioEngine.muted} onChange={(e) => audioEngineActions.setMuted(e.target.checked)} />
        {audioEngine.muted ? 'Muted' : 'Unmuted'}
      </label>
    </div>
  );
}
