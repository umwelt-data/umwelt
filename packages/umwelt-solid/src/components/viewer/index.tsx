import styles from '../../App.module.scss';
import { Visualization } from './visualization';
import { TextualStructure } from './textualStructure';
import { Sonification } from './sonification';

import { UmweltSelectionProvider } from '../../contexts/UmweltSelectionContext';
import { UmweltSpec } from '../../types';
import { cleanData, typeCoerceData } from '../../util/datasets';
import { createMemo } from 'solid-js';

export interface UmweltViewerProps {
  spec: UmweltSpec;
}

export function UmweltViewer(props: UmweltViewerProps) {
  const spec = createMemo(() => {
    const data = cleanData(typeCoerceData(props.spec.data.values, props.spec.fields), props.spec.fields);
    return { ...props.spec, data: { ...props.spec.data, values: data } };
  });

  return (
    <div class={styles.Viewer}>
      <div class="uw-viewer" role="region" aria-label="Umwelt Viewer">
        <UmweltSelectionProvider>
          <h2>Visualization</h2>
          <Visualization spec={spec()} />

          <h2>Description</h2>
          <TextualStructure spec={spec()} />

          <h2>Sonification</h2>
          <Sonification spec={spec()} />
        </UmweltSelectionProvider>
      </div>
    </div>
  );
}
