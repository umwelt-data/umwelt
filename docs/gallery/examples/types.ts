import type { UmweltSpec } from 'umwelt-js';

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
  /** The exportable Umwelt specification. */
  spec: UmweltSpec;
}
