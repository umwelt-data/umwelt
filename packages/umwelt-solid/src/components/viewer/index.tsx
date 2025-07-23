import styles from '../../App.module.scss';
import { Visualization } from './visualization';
import { TextualStructure } from './textualStructure';
import { Sonification } from './sonification';

import { UmweltSelectionProvider } from '../../contexts/UmweltSelectionContext';
import { UmweltDataset, UmweltSpec } from '../../types';

export interface UmweltViewerProps {
  spec: UmweltSpec;
  data: UmweltDataset;
}

export function UmweltViewer(props: UmweltViewerProps) {
  return (
    <div class={styles.Viewer}>
      <div class="uw-viewer" role="region" aria-label="Umwelt Viewer">
        <UmweltSelectionProvider>
          <h2>Visualization</h2>
          <Visualization spec={props.spec} data={props.data} />

          <h2>Description</h2>
          <TextualStructure spec={props.spec} data={props.data} />

          <h2>Sonification</h2>
          <Sonification spec={props.spec} data={props.data} />
        </UmweltSelectionProvider>
      </div>
    </div>
  );
}

export { UmweltViewerWrapper } from './UmweltViewerWrapper';
