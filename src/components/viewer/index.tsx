import { useUmweltSpec } from '../../contexts/UmweltSpecContext';

import styles from '../../App.module.css';
import { Visualization } from './visualization';
import { TextualStructure } from './textualStructure';
import { exportableSpec, prettyPrintSpec, shareSpecURL } from '../../util/spec';
import { Sonification } from './sonification';

import { styled } from 'solid-styled-components';
import { UmweltSelectionProvider } from '../../contexts/UmweltSelectionContext';

const ExportUrlInput = styled('input')`
  width: 100%;
`;
const ExportSpecTextarea = styled('textarea')`
  width: 100%;
`;

export function Viewer() {
  const [spec, setSpec] = useUmweltSpec();

  return (
    <div class={styles.Viewer}>
      <h1>Viewer</h1>

      <details>
        <summary>Export</summary>
        <label>
          Shareable Editor URL
          <ExportUrlInput readonly type="url" value={shareSpecURL(spec)} />
        </label>
        {/** TODO add an embeddable URL of just the viewer */}
        <label>
          Spec
          <ExportSpecTextarea readonly rows={30}>
            {prettyPrintSpec(exportableSpec(spec))}
          </ExportSpecTextarea>
        </label>
      </details>
      <UmweltSelectionProvider>
        <h2>Visualization</h2>
        <Visualization />

        <h2>Description</h2>
        <TextualStructure />

        <h2>Sonification</h2>
        <Sonification />
      </UmweltSelectionProvider>
    </div>
  );
}
