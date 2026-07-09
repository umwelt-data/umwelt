import type { UmweltSpec } from 'umwelt-js';

/**
 * Short, plain-language characterizations of what each modality does in an
 * example. The gallery is organized by data structure (dimensions × measures),
 * which is precise but abstract; these tags reground each example in the
 * familiar chart vocabulary and say what the sonification and text structure
 * sound/read like, so the abstract grouping stays approachable.
 */
export interface ExampleTags {
  /** Familiar chart-type name(s), e.g. "Scatterplot", "Bar chart". */
  visual: string;
  /** What the sonification does, e.g. "Pitch nested by type, then year". */
  audio: string;
  /** How the textual structure reads, e.g. "Grouped by company". */
  text: string;
}

/**
 * Gallery example metadata. Each example holds a complete exportable
 * UmweltSpec that the gallery renders with `createViewer` and links
 * into the hosted editor.
 */
export interface GalleryExample {
  /** kebab-case; also used as the URL slug at `/gallery/:id/`. */
  id: string;
  title: string;
  /** 1–2 sentences shown on the example page. */
  description?: string;
  /** Per-modality one-line characterizations shown as tags. */
  tags: ExampleTags;
  /** The exportable Umwelt specification. */
  spec: UmweltSpec;
}
