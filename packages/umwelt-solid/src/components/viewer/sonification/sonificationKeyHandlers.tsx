import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';
import { useKeyHandlers } from '../../../util/keyHandlers';

/**
 * Registers keyboard shortcuts for sonification controls.
 * Must be mounted inside AudioEngineProvider and SonificationStateProvider.
 *
 * Keybindings:
 *   p — toggle play/pause (equivalent to clicking the Play/Pause button)
 */
export function SonificationKeyHandlers() {
  const [audioEngine, audioEngineActions] = useAudioEngine();
  const [_, sonificationStateActions] = useSonificationState();

  useKeyHandlers({
    p: () => {
      if (audioEngine.isPlaying) {
        audioEngineActions.stopTransport();
      } else {
        sonificationStateActions.triggerPlay();
      }
    },
  });

  return null;
}
