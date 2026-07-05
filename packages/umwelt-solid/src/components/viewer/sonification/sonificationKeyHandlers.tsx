import { useAudioEngine } from '../../../contexts/sonification/AudioEngineContext';
import { useSonificationState } from '../../../contexts/sonification/SonificationStateContext';
import { useKeyHandlers } from '../../../util/keyHandlers';

export type SonificationKeyHandlersProps = {
  /** Scope the shortcuts to this element (the viewer root) so sibling embeds
   *  on the same page don't also respond. Falls back to document when absent. */
  target?: () => HTMLElement | null | undefined;
};

/**
 * Registers keyboard shortcuts for sonification controls.
 * Must be mounted inside AudioEngineProvider and SonificationStateProvider.
 *
 * Keybindings:
 *   p — toggle play/pause (equivalent to clicking the Play/Pause button)
 */
export function SonificationKeyHandlers(props: SonificationKeyHandlersProps) {
  const [audioEngine, audioEngineActions] = useAudioEngine();
  const [_, sonificationStateActions] = useSonificationState();

  useKeyHandlers(
    {
      p: () => {
        if (audioEngine.isPlaying) {
          audioEngineActions.stopTransport();
        } else {
          sonificationStateActions.triggerPlay();
        }
      },
    },
    props.target
  );

  return null;
}
