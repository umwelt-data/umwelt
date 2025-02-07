import styles from '../../App.module.scss';
import { Visualization } from './visualization';
import { TextualStructure } from './textualStructure';
import { exportableSpec, prettyPrintSpec, shareSpecURL } from '../../util/spec';
import { Sonification } from './sonification';

import { styled } from 'solid-styled-components';
import { UmweltSelectionProvider } from '../../contexts/UmweltSelectionContext';
import { UmweltSpec } from '../../types';
import { cleanData, typeCoerceData } from '../../util/datasets';
import { createMemo } from 'solid-js';

const ExportUrlInput = styled('input')`
  width: 100%;
`;
const ExportSpecTextarea = styled('textarea')`
  width: 100%;
`;

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
      <h1 id="header-viewer">Viewer</h1>
      <div class="uw-viewer" role="region" aria-labelledby="header-viewer">
        <details>
          <summary>Export</summary>
          <label>
            Shareable Editor URL
            <ExportUrlInput readonly type="url" value={shareSpecURL(spec())} />
          </label>
          {/** TODO add an embeddable URL of just the viewer */}
          <label>
            Spec
            <ExportSpecTextarea readonly rows={30}>
              {prettyPrintSpec(exportableSpec(spec()))}
            </ExportSpecTextarea>
          </label>
        </details>
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
