import styles from '../../App.module.css';
import { Visualization } from './visualization';
import { TextualStructure } from './textualStructure';
import { exportableSpec, prettyPrintSpec, shareSpecURL } from '../../util/spec';
import { Sonification } from './sonification';

import { styled } from 'solid-styled-components';
import { UmweltSelectionProvider } from '../../contexts/UmweltSelectionContext';
import { UmweltSpec } from '../../types';

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
  return (
    <div class={styles.Viewer}>
      <h1 id="header-viewer">Viewer</h1>
      <div class="uw-viewer" role="region" aria-labelledby="header-viewer">
        <details>
          <summary>Export</summary>
          <label>
            Shareable Editor URL
            <ExportUrlInput readonly type="url" value={shareSpecURL(props.spec)} />
          </label>
          {/** TODO add an embeddable URL of just the viewer */}
          <label>
            Spec
            <ExportSpecTextarea readonly rows={30}>
              {prettyPrintSpec(exportableSpec(props.spec))}
            </ExportSpecTextarea>
          </label>
        </details>
        <UmweltSelectionProvider>
          <h2>Visualization</h2>
          <Visualization spec={props.spec} />

          <h2>Description</h2>
          <TextualStructure spec={props.spec} />

          <h2>Sonification</h2>
          <Sonification spec={props.spec} />
        </UmweltSelectionProvider>
      </div>
    </div>
  );
}
