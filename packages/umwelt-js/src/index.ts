import { UmweltViewerWrapper } from '../../umwelt-solid/src/components/viewer/UmweltViewerWrapper';
import { render } from 'solid-js/web';
import { ExportableSpec } from '../../umwelt-solid/src/types';

// Re-export types that consumers might need
export type { ExportableSpec as UmweltSpec, UmweltDataset, UmweltDatum, UmweltValue } from '../../umwelt-solid/src/types';

export interface UmweltViewerOptions {
  spec: ExportableSpec;
  container: HTMLElement;
}

/**
 * Framework-agnostic Umwelt viewer that can be embedded in any web application.
 * Internally uses SolidJS but exposes a simple JavaScript API.
 */
export class UmweltViewer {
  private disposal?: () => void;
  private isDestroyed = false;

  constructor(private options: UmweltViewerOptions) {
    this.mount();
  }

  private mount() {
    if (this.isDestroyed) {
      throw new Error('Cannot mount a destroyed UmweltViewer. Create a new instance.');
    }

    this.disposal = render(() => UmweltViewerWrapper({ exportableSpec: this.options.spec }), this.options.container);
  }

  /**
   * Update the viewer with a new specification.
   * This will re-render the entire viewer with the new data and configuration.
   */
  updateSpec(newSpec: ExportableSpec): void {
    if (this.isDestroyed) {
      throw new Error('Cannot update a destroyed UmweltViewer.');
    }

    this.cleanup();
    this.options.spec = newSpec;
    this.mount();
  }

  /**
   * Get the current specification.
   */
  getSpec(): ExportableSpec {
    return this.options.spec;
  }

  /**
   * Get the container element.
   */
  getContainer(): HTMLElement {
    return this.options.container;
  }

  private cleanup() {
    if (this.disposal) {
      this.disposal();
      this.disposal = undefined;
    }
  }

  /**
   * Destroy the viewer and clean up all resources.
   * The viewer cannot be used after calling this method.
   */
  destroy(): void {
    this.cleanup();
    this.isDestroyed = true;
  }

  /**
   * Check if the viewer has been destroyed.
   */
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }
}

/**
 * Convenience function to create and mount an Umwelt viewer.
 *
 * @param spec The Umwelt specification defining the data and visualizations
 * @param container The DOM element to render the viewer into
 * @returns A new UmweltViewer instance
 *
 * @example
 * ```javascript
 * import { createViewer } from 'umwelt-js';
 *
 * const viewer = createViewer(mySpec, document.getElementById('viewer'));
 *
 * // Later update the data
 * viewer.updateSpec(newSpec);
 *
 * // Clean up when done
 * viewer.destroy();
 * ```
 */
export function createViewer(spec: ExportableSpec, container: HTMLElement): UmweltViewer {
  return new UmweltViewer({ spec, container });
}
