import { onMount, onCleanup } from 'solid-js';

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export type KeyHandlerMap = Partial<Record<string, () => void>>;

/**
 * Registers document-level keydown handlers.
 * Handlers are skipped when focus is on an interactive input element.
 * Call inside a component (respects SolidJS onMount/onCleanup lifecycle).
 */
export function useKeyHandlers(handlers: KeyHandlerMap) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isInputFocused()) return;
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  onMount(() => document.addEventListener('keydown', handleKeyDown));
  onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
}
