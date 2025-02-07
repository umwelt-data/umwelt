import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { styled } from 'solid-styled-components';

export type AudioEngineControlProps = {};

const AudioEngineControlContainer = styled.div`
  margin-top: 1rem;
`;

const SpeakAxisTicksRow = styled.div`
  display: flex;
  gap: 3px;
`;

export function AudioEngineControl(props: AudioEngineControlProps) {
  const [audioEngine, audioEngineActions] = useAudioEngine();

  return (
    <AudioEngineControlContainer>
      <div>
        <label>
          Playback rate <input type="number" min="0.1" max="2" value={audioEngine.playbackRate} step={0.1} id="rate" onChange={(e) => audioEngineActions.setPlaybackRate(Number(e.target.value))} />x
        </label>
      </div>
      <SpeakAxisTicksRow>
        <label>
          <input type="checkbox" checked={audioEngine.speakAxisTicks} onChange={(e) => audioEngineActions.setSpeakAxisTicks(e.target.checked)} />
          Speak axis ticks
        </label>
        <label>
          <input type="number" min="1" max="100" value={audioEngine.speechRate} step={10} id="speechRate" onChange={(e) => audioEngineActions.setSpeechRate(Number(e.target.value))} />
          speech rate
        </label>
      </SpeakAxisTicksRow>
      <div>
        <label>
          <input type="checkbox" aria-live="polite" checked={audioEngine.muted} onChange={(e) => audioEngineActions.setMuted(e.target.checked)} />
          {audioEngine.muted ? 'Muted' : 'Unmuted'}
        </label>
      </div>
    </AudioEngineControlContainer>
  );
}
