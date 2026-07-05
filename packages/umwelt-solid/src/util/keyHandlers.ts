import { createEffect, onCleanup } from 'solid-js';

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export type KeyHandlerMap = Partial<Record<string, () => void>>;

/**
 * Registers keydown handlers.
 * Handlers are skipped when focus is on an interactive input element.
 * Call inside a component (respects SolidJS lifecycle).
 *
 * Pass `getTarget` to scope the listener to a specific element instead of the
 * document. Because keydown bubbles from the focused element, a listener on a
 * viewer's root only fires when focus is within that viewer — this is how two
 * embeds on one page keep their shortcuts (e.g. 'p') from firing on each other.
 * When a `getTarget` is supplied but not yet mounted the effect no-ops and
 * re-runs once it resolves.
 */
export function useKeyHandlers(handlers: KeyHandlerMap, getTarget?: () => HTMLElement | null | undefined) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isInputFocused()) return;
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  createEffect(() => {
    const target: HTMLElement | Document | null | undefined = getTarget ? getTarget() : document;
    if (!target) return;
    target.addEventListener('keydown', handleKeyDown as EventListener);
    onCleanup(() => target.removeEventListener('keydown', handleKeyDown as EventListener));
  });
}
